// backend/controllers/conversationController.js
const conversationModel = require('../models/conversationModel');
const aiService = require('../services/aiService');

/**
 * 会話開始
 */
exports.startConversation = async (req, res) => {
    const { employeeId, employeeName, theme, stance } = req.body;
    const user = req.user;

    // どのキーに org が入っているかを確認（開発ログ）
    console.log('[startConversation] user payload =', {
        id: user?.id,
        organization_id: user?.organization_id,
        organizationId: user?.organizationId,
        org_id: user?.org_id,
        orgId: user?.orgId,
    });

    if (!employeeId || !theme || !stance) {
        return res.status(400).json({ message: 'Employee ID, theme, and stance are required' });
    }

    try {
        const convData = { employeeId, theme, engagement: stance };
        const conversationId = await conversationModel.createConversation(convData, user);
        const initialAiData = await aiService.generateInitialMessage(employeeName || '部下', theme, stance);

        await conversationModel.addMessage(
            conversationId,
            'ai',
            initialAiData.response_text,
            initialAiData.suggested_questions
        );

        res.status(201).json({
            message: 'Conversation started successfully',
            conversationId,
            initialMessage: {
                sender: 'ai',
                message: initialAiData.response_text,
                suggested_questions: initialAiData.suggested_questions,
            },
        });
    } catch (error) {
        console.error('Error starting conversation:', error);
        res.status(500).json({ message: 'Failed to start conversation' });
    }
};

/**
 * メッセージ投稿 → AI フォローアップ
 */
exports.postMessage = async (req, res) => {
    const { id: conversationId } = req.params;
    const { sender, message } = req.body;
    const user = req.user;

    if (!sender || !message) {
        return res.status(400).json({ message: 'Sender and message are required.' });
    }

    try {
        const conversation = await conversationModel.getConversationById(conversationId, user);
        if (!conversation) {
            return res
                .status(404)
                .json({ message: 'Conversation not found or access denied.' });
        }

        await conversationModel.addMessage(conversationId, sender, message);

        const updatedHistory = [...(conversation.messages || []), { sender, message }];
        const aiData = await aiService.generateFollowUp(
            updatedHistory,
            conversation.theme,
            conversation.engagement
        );

        const aiMessageId = await conversationModel.addMessage(
            conversationId,
            'ai',
            aiData.response_text,
            aiData.suggested_questions
        );

        res.status(201).json({
            id: aiMessageId,
            sender: 'ai',
            message: aiData.response_text,
            suggested_questions: aiData.suggested_questions,
        });
    } catch (error) {
        console.error(`Error posting message to conversation ${conversationId}:`, error);
        res.status(500).json({ message: 'Failed to process message.' });
    }
};

/**
 * 会話一覧
 */
exports.listConversations = async (req, res) => {
    try {
        const conversations = await conversationModel.getAllConversations(req.user);
        res.json(conversations);
    } catch (error) {
        console.error('Error listing conversations:', error);
        res.status(500).json({ error: 'Failed to retrieve conversations.' });
    }
};

/**
 * 会話詳細
 */
exports.getConversationDetails = async (req, res) => {
    try {
        const conversation = await conversationModel.getConversationById(
            req.params.id,
            req.user
        );
        if (!conversation) {
            return res
                .status(404)
                .json({ error: 'Conversation not found or permission denied.' });
        }
        res.json(conversation);
    } catch (error) {
        console.error('Error getting conversation details:', error);
        res.status(500).json({ error: 'Failed to retrieve conversation details.' });
    }
};

/**
 * 部分更新（memo / mindMapData / transcript）
 */
exports.updateConversation = async (req, res) => {
    try {
        // snake_case でも camelCase でも受け付ける
        const patch = { ...req.body };
        if (
            typeof patch.mindMapData === 'undefined' &&
            typeof patch.mind_map_data !== 'undefined'
        ) {
            patch.mindMapData = patch.mind_map_data;
        }
        const updatedConversation = await conversationModel.updateConversation(
            req.params.id,
            patch,
            req.user
        );
        if (!updatedConversation) {
            return res
                .status(404)
                .json({ error: 'Conversation not found or permission denied.' });
        }
        res.json(updatedConversation);
    } catch (error) {
        console.error('Error updating conversation:', error);
        res.status(500).json({ error: 'Failed to update conversation.' });
    }
};

/**
 * 会話削除
 */
exports.deleteConversation = async (req, res) => {
    try {
        const deletedCount =
            await conversationModel.deleteConversationAndMessages(
                req.params.id,
                req.user
            );
        if (deletedCount === 0) {
            return res
                .status(404)
                .json({ error: 'Conversation not found or permission denied.' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ error: 'Failed to delete conversation.' });
    }
};

/**
 * ★ Deep Dive（要約・ネクストアクションのクリック深掘り）
 */
exports.deepDiveExplanation = async (req, res) => {
    const { id: conversationId } = req.params;
    const { queryText } = req.body || {};
    const user = req.user;

    if (!conversationId || !queryText || !queryText.trim()) {
        return res
            .status(400)
            .json({ error: 'Conversation ID and queryText are required.' });
    }

    try {
        const conversation = await conversationModel.getConversationById(
            conversationId,
            user
        );
        if (!conversation) {
            return res
                .status(404)
                .json({ error: 'Conversation not found or permission denied.' });
        }

        const context = {
            theme: conversation.theme,
            engagement: conversation.engagement,
            summary: conversation.summary,
            nextActions: conversation.next_actions,
            transcript: conversation.transcript,
            messages: conversation.messages || [],
        };

        const prompt = aiService.getDeepDivePrompt(queryText, context);
        const explanationMd = await aiService.generateContent(prompt);

        res.json({ explanation: explanationMd });
    } catch (error) {
        console.error('Error in deepDiveExplanation:', error);
        res
            .status(500)
            .json({ error: 'Failed to generate deep dive explanation.' });
    }
};

/**
 * ★ 要約と分析
 */
exports.summarizeConversation = async (req, res) => {
    const { id: conversationId } = req.params;
    const { transcript } = req.body;
    const user = req.user;

    if (!conversationId) {
        return res.status(400).json({ error: 'Conversation ID is required.' });
    }

    try {
        const conversation = await conversationModel.getConversationById(
            conversationId,
            user
        );
        if (!conversation) {
            return res
                .status(404)
                .json({ error: 'Conversation not found or permission denied.' });
        }

        const messages =
            await conversationModel.getMessagesByConversationId(conversationId);
        const formattedMessages = messages
            .map((msg) =>
                `${msg.sender === 'user' ? '上司' : msg.sender === 'employee' ? '部下' : 'AI'}: ${msg.message}`
            )
            .join('\n');
        const fullTranscript = transcript || conversation.transcript || '';

        const [summaryContent, keywordsText, sentimentJsonText] = await Promise.all(
            [
                aiService.generateContent(
                    aiService.getSummaryPrompt(formattedMessages, fullTranscript)
                ),
                aiService.generateContent(aiService.getKeywordsPrompt(formattedMessages)),
                aiService.generateContent(aiService.getSentimentPrompt(formattedMessages)),
            ]
        );

        // セクション抽出（既存仕様そのまま）
        const sectionRegex = /\*\*(.+?)\*\*\s*\n([\s\S]*?)(?=\n\*\*|$)/g;
        const sections = {};
        let sectionMatch;
        while ((sectionMatch = sectionRegex.exec(summaryContent)) !== null) {
            const title = sectionMatch[1]?.trim();
            if (!title) continue;
            sections[title] = sectionMatch[2]?.trim() || '';
        }

        const legacySummaryMatch = summaryContent.match(
            /\*\*要約:\*\*\n([\s\S]*?)(?=\*\*ネクストアクション:\*\*|$)/
        );
        const legacyNextMatch = summaryContent.match(
            /\*\*ネクストアクション:\*\*\n([\s\S]*)/
        );

        const highlight = sections['ハイライト（最大3件）'];
        const background = sections['部下の背景と意図（200〜300文字）'];
        const followHint = sections['フォローのヒント（任意 1〜2行）'];
        const modernNext = sections['ネクストアクション（3件以内）'];

        const compiledSummaryParts = [];
        if (highlight) compiledSummaryParts.push('**ハイライト**\n' + highlight.trim());
        if (background)
            compiledSummaryParts.push('**部下の背景と意図**\n' + background.trim());
        if (followHint)
            compiledSummaryParts.push('**フォローのヒント**\n' + followHint.trim());

        const summary =
            compiledSummaryParts.length > 0
                ? compiledSummaryParts.join('\n\n')
                : legacySummaryMatch
                    ? legacySummaryMatch[1].trim()
                    : summaryContent.trim();

        const nextActions =
            modernNext && modernNext.trim().length > 0
                ? modernNext.trim()
                : legacyNextMatch
                    ? legacyNextMatch[1].trim()
                    : '';

        const keywords = keywordsText
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k.length > 0);
        const sentimentResult = JSON.parse(
            sentimentJsonText.replace(/```json\n|```/g, '').trim()
        );

        await Promise.all([
            conversationModel.updateConversationSummary(
                summary,
                nextActions,
                conversationId
            ),
            conversationModel.saveKeywords(conversationId, keywords),
            conversationModel.saveSentiment(conversationId, sentimentResult),
            conversationModel.updateConversationTranscript(
                fullTranscript,
                conversationId
            ),
        ]);

        res.json({ summary, nextActions });
    } catch (error) {
        console.error('Error summarizing conversation:', error);
        res.status(500).json({ error: 'Failed to summarize conversation.' });
    }
};

/**
 * ワンポイントアドバイス API（Markdown を返却）
 */
exports.onePointAdvice = async (req, res) => {
    const { id: conversationId } = req.params;
    const user = req.user;

    try {
        const conversation = await conversationModel.getConversationById(
            conversationId,
            user
        );
        if (!conversation) {
            return res
                .status(404)
                .json({ error: 'Conversation not found or permission denied.' });
        }

        const messages =
            await conversationModel.getMessagesByConversationId(conversationId);
        const formattedMessages = messages
            .map((m) =>
                `${m.sender === 'user' ? '上司' : m.sender === 'employee' ? '部下' : 'AI'}: ${m.message}`
            )
            .join('\n');

        const context = {
            theme: conversation.theme,
            engagement: conversation.engagement,
            summary: conversation.summary,
            nextActions: conversation.next_actions,
            transcript: conversation.transcript,
            formattedMessages,
        };

        const prompt = aiService.getOnePointAdvicePrompt(context);
        const advice_md = await aiService.generateContent(prompt);

        res.json({ advice_md });
    } catch (error) {
        console.error('Error generating one-point advice:', error);
        res.status(500).json({ error: 'Failed to generate advice.' });
    }
};

/**
 * 質問例の更新（初回と同じプロンプトを使用）
 * 1) generateInitialMessage でまず 4件候補を作る（初回と同じ語り口）
 * 2) 足りなければ generateFollowUp で補完（ユニーク化・「その他」除外）
 */
exports.refreshQuestions = async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    if (!id) return res.status(400).json({ error: 'Conversation ID is required.' });

    try {
        const conversation = await conversationModel.getConversationById(id, user);
        if (!conversation) {
            return res
                .status(404)
                .json({ error: 'Conversation not found or permission denied.' });
        }

        const employeeName = conversation.employee_name || '部下';
        const theme = conversation.theme;
        const engagement = conversation.engagement;

        // 初回プロンプトと同じ生成
        const init = await aiService.generateInitialMessage(
            employeeName,
            theme,
            engagement
        );
        let list = (init?.suggested_questions || [])
            .map((s) => (s || '').trim())
            .filter((q) => q && !/その他/i.test(q));

        // 不足分は履歴ベースで補完
        if (list.length < 4) {
            const messages = await conversationModel.getMessagesByConversationId(id);
            const history = messages.map((m) => ({
                sender: m.sender,
                message: m.message,
            }));
            const fu = await aiService.generateFollowUp(history, theme, engagement);
            for (const q of fu?.suggested_questions || []) {
                const t = (q || '').trim();
                if (!t || /その他/i.test(t)) continue;
                if (!list.includes(t)) list.push(t);
                if (list.length >= 4) break;
            }
        }

        return res.json({ suggested_questions: list.slice(0, 4) });
    } catch (e) {
        console.error('refreshQuestions error:', e);
        return res.status(500).json({ error: 'Failed to refresh questions' });
    }
};
