// backend/controllers/chatController.js

const model = require('../models/conversationModel');
const aiService = require('../services/aiService');

const handleChat = async (req, res) => {
    const { message: userMessage, conversationId: reqConversationId, appState: clientAppState, employeeId: reqEmployeeId } = req.body;
    let newConversationId = reqConversationId;

    try {
        // --- 固定フローの制御 ---
        if (userMessage === '__START__') {
            const reply = `こんにちは。1on1傾聴サポートAIです。部下の方との1on1、私が傾聴の側面からサポートします。地蔵1on1メソッドに基づき、部下の方の内省を深め、心理的安全性の高い対話を実現するお手伝いをします。\nもし前回の1on1で部下に宿題や考えておいてほしいことをお伝えしていた場合は、まずそちらの確認から始めるとよいでしょう。\n本日はどのようなテーマについてお話ししたいですか? もしよろしければ、以下の選択肢から近いものを選ぶか、自由にお聞かせください。`;
            return res.json({ reply });
        }

        if (clientAppState === 'theme_selection') {
            if (!reqEmployeeId) {
                return res.status(400).json({ error: 'Employee ID is required to start a new conversation.' });
            }
            newConversationId = await model.createConversation(userMessage, '初期設定中', reqEmployeeId);
            await model.addMessage(newConversationId, 'user', userMessage);
            const reply = `ありがとうございます。そのテーマの中で期待する関わり方の中から最も近いものを教えていただけますでしょうか。`;
            await model.addMessage(newConversationId, 'ai', reply);
            return res.json({ reply, conversationId: newConversationId, employeeId: reqEmployeeId });
        }

        if (clientAppState === 'engagement_selection') {
            await model.updateConversationEngagement(userMessage, newConversationId);
            const reply = `承知いたしました。選択いただいたテーマと関わり方を念頭に置き、サポートさせていただきます。本日はこのテーマと関わり方で進めてまいります。\nそれでは、1on1を進めてください。私はここで待機しています。\n傾聴する時に困ったら、部下から言われたこと「○○(部下のセリフ)と言われました」をそのまま入力してみてください。(話し手のセリフか聞き手のセリフか区別するため)\nまた、『どう応答すれば良いか迷う』 『部下のこの発言にどう対応しよう』『こんな時、どんな質問が効果的か』など、サポートが必要になったらいつでも、このチャットに状況や疑問を具体的にお知らせください。その際に、的確なアドバイスやヒントを提供します。\n(※もし関わり方で「3」や「4」を選ばれた場合でも、地蔵メソッドに基づき、まずは部下の方の内省を促すことを最優先しますのでご了承ください)\n選択いただいたテーマと関わり方に基づいて、以下のような質問から会話を始めてみるとよいでしょう:\n（ここでは選択されたテーマと関わり方に応じた質問例を5つ程度提示します。例えば:\n・テーマが「業務やタスク」で関わり方が「じっくり聞く」なら:「最近の業務で特に気になることはありますか?」\n・テーマが「キャリア」で関わり方が「壁打ち」なら:「今後のキャリアについてどんなことを考えていますか?」\n・テーマが「健康」で関わり方が「助言」なら:「最近の体調や健康面で気になる点を教えていただけますか?」\nなど、状況に応じた具体的な質問例を提示します)\nでは、どうぞ始めてください。`;
            await model.addMessage(newConversationId, 'ai', reply);
            return res.json({ reply, conversationId: newConversationId });
        }

        // --- 通常のオンデマンドモード ---
        await model.addMessage(newConversationId, 'user', userMessage);
        
        const conversationDetail = await model.getConversationById(newConversationId);
        const fullPrompt = aiService.getChatPrompt(conversationDetail.theme, conversationDetail.engagement, userMessage);
        const aiReply = await aiService.generateContent(fullPrompt);

        await model.addMessage(newConversationId, 'ai', aiReply);
        res.json({ reply: aiReply, conversationId: newConversationId });

    } catch (error) {
        console.error('Chat handling error:', error);
        res.status(500).json({ error: 'An error occurred during chat processing.' });
    }
};

const summarizeConversation = async (req, res) => {
    const { conversationId } = req.body;
    if (!conversationId) {
        return res.status(400).json({ error: 'Conversation ID is required.' });
    }

    try {
        const messages = await model.getMessagesByConversationId(conversationId);
        if (messages.length === 0) {
            return res.status(404).json({ error: 'No messages found for this conversation ID.' });
        }
        const formattedMessages = messages.map(msg => `${msg.sender === 'user' ? '上司' : 'AI'}: ${msg.text}`).join('\n');

        // 要約、キーワード、感情を並行して生成
        const [summaryContent, keywordsText, sentimentJsonText] = await Promise.all([
            aiService.generateContent(aiService.getSummaryPrompt(formattedMessages)),
            aiService.generateContent(aiService.getKeywordsPrompt(formattedMessages)),
            aiService.generateContent(aiService.getSentimentPrompt(formattedMessages))
        ]);

        // 要約とネクストアクションのパース
        const summaryMatch = summaryContent.match(/\*\*要約:\*\*\n([\s\S]*?)(?=\*\*ネクストアクション:\*\*|$)/);
        const nextActionsMatch = summaryContent.match(/\*\*ネクストアクション:\*\*\n([\s\S]*)/);
        const summary = summaryMatch ? summaryMatch[1].trim() : '要約の生成に失敗しました。';
        const nextActions = nextActionsMatch ? nextActionsMatch[1].trim() : 'ネクストアクションの生成に失敗しました。';

        // キーワードのパース
        const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0);

        // 感情のパース
        const cleanSentimentText = sentimentJsonText.replace(/```json\n|```/g, '').trim();
        const sentimentResult = JSON.parse(cleanSentimentText);
        sentimentResult.positive_score = parseFloat(sentimentResult.positive_score) || 0;
        sentimentResult.negative_score = parseFloat(sentimentResult.negative_score) || 0;
        sentimentResult.neutral_score = parseFloat(sentimentResult.neutral_score) || 0;
        
        // DBに保存
        await Promise.all([
            model.updateConversationSummary(summary, nextActions, conversationId),
            model.saveKeywords(conversationId, keywords),
            model.saveSentiment(conversationId, sentimentResult)
        ]);

        res.json({ summary, nextActions });

    } catch (error) {
        console.error('Error in summarizeConversation:', error);
        res.status(500).json({ error: 'Failed to generate summary or next actions.' });
    }
};

module.exports = { handleChat, summarizeConversation };