// backend/controllers/chatController.js (最終修正版)

const model = require('../models/conversationModel');
const aiService = require('../services/aiService');

const handleChat = async (req, res) => {
    const { message: userMessage, conversationId, appState, employeeId, chatHistory, transcript } = req.body;
    const user = req.user;

    try {
        if (userMessage === '__START__') {
            const reply = `こんにちは。1on1傾聴サポートAIです。部下の方との1on1、私が傾聴の側面からサポートします。地蔵1on1メソッドに基づき、部下の方の内省を深め、心理的安全性の高い対話を実現するお手伝いをします.\nもし前回の1on1で部下に宿題や考えておいてほしいことをお伝えしていた場合は、まずそちらの確認から始めるとよいでしょう.\n本日はどのようなテーマについてお話ししたいですか? もしよろしければ、以下の選択肢から近いものを選ぶか、自由にお聞かせください。`;
            return res.json({ reply });
        }

        if (appState === 'theme_selection') {
            if (!employeeId) return res.status(400).json({ error: 'Employee ID is required.' });
            const convData = { theme: userMessage, engagement: '初期設定中', employeeId };
            const newConversationId = await model.createConversation(convData, user);
            
            await model.addMessage(newConversationId, 'user', userMessage);
            const reply = `ありがとうございます。そのテーマの中で期待する関わり方の中から最も近いものを教えていただけますでしょうか。`;
            await model.addMessage(newConversationId, 'ai', reply);
            return res.json({ reply, conversationId: newConversationId });
        }
        
        if (!conversationId) return res.status(400).json({ error: 'Conversation ID is required for this action.' });

        const conversationDetail = await model.getConversationById(conversationId, user);
        if (!conversationDetail) return res.status(404).json({ error: 'Conversation not found or permission denied.' });

        await model.addMessage(conversationId, 'user', userMessage);

        if (appState === 'engagement_selection') {
            await model.updateConversationEngagement(userMessage, conversationId); // 権限チェックはgetConversationByIdで済んでいる
            const reply = `承知いたしました。選択いただいたテーマと関わり方を念頭に置き、サポートさせていただきます。本日はこのテーマと関わり方で進めてまいります.\nそれでは、1on1を進めてください。私はここで待機しています.\n傾聴する時に困ったら、部下から言われたこと「○○(部下のセリフ)と言われました」をそのまま入力してみてください。(話し手のセリフか聞き手のセリフか区別するため)\nまた、『どう応答すれば良いか迷う』 『部下のこの発言にどう対応しよう』『こんな時、どんな質問が効果的か』など、サポートが必要になったらいつでも、このチャットに状況や疑問を具体的にお知らせください。その際に、的確なアドバイスやヒントを提供します.\n(※もし関わり方で「3」や「4」を選ばれた場合でも、地蔵メソッドに基づき、まずは部下の方の内省を促すことを最優先しますのでご了承ください)\n選択いただいたテーマと関わり方に基づいて、以下のような質問から会話を始めてみるとよいでしょう:\n（ここでは選択されたテーマと関わり方に応じた質問例を5つ程度提示します。例えば:\n・テーマが「業務やタスク」で関わり方が「じっくり聞く」なら:「最近の業務で特に気になることはありますか?」\n・テーマが「キャリア」で関わり方が「壁打ち」なら:「今後のキャリアについてどんなことを考えていますか?」\n・テーマが「健康」で関わり方が「助言」なら:「最近の体調や健康面で気になる点を教えていただけますか?」\nなど、状況に応じた具体的な質問例を提示します)\nでは、どうぞ始めてください。`; // (長文のため省略)
            await model.addMessage(conversationId, 'ai', reply);
            return res.json({ reply, conversationId });
        }

        const formattedTranscript = transcript && transcript.length > 0
            ? transcript.map(item => `話者${item.speakerTag}: ${item.transcript}`).join('\n')
            : '';

        const fullPrompt = aiService.getChatPrompt(
            conversationDetail.theme, 
            conversationDetail.engagement, 
            userMessage,
            chatHistory,
            formattedTranscript
        );
        const aiReply = await aiService.generateContent(fullPrompt);
        await model.addMessage(conversationId, 'ai', aiReply);
        res.json({ reply: aiReply, conversationId });

    } catch (error) {
        console.error('Chat handling error:', error);
        res.status(500).json({ error: 'An error occurred during chat processing.' });
    }
};

const summarizeConversation = async (req, res) => {
    const { conversationId, transcript } = req.body;
    const user = req.user;
    if (!conversationId) return res.status(400).json({ error: 'Conversation ID is required.' });

    try {
        const conversation = await model.getConversationById(conversationId, user);
        if (!conversation) return res.status(404).json({ error: 'Conversation not found or permission denied.' });
        
        const messages = await model.getMessagesByConversationId(conversationId);
        const formattedMessages = messages.map(msg => `${msg.sender === 'user' ? '上司' : 'AI'}: ${msg.text}`).join('\n');

        const [summaryContent, keywordsText, sentimentJsonText] = await Promise.all([
            aiService.generateContent(aiService.getSummaryPrompt(formattedMessages, transcript)),
            aiService.generateContent(aiService.getKeywordsPrompt(formattedMessages, transcript)),
            aiService.generateContent(aiService.getSentimentPrompt(formattedMessages, transcript))
        ]);
        
        const summaryMatch = summaryContent.match(/\*\*要約:\*\*\n([\s\S]*?)(?=\*\*ネクストアクション:\*\*|$)/);
        const nextActionsMatch = summaryContent.match(/\*\*ネクストアクション:\*\*\n([\s\S]*)/);
        const summary = summaryMatch ? summaryMatch[1].trim() : '';
        const nextActions = nextActionsMatch ? nextActionsMatch[1].trim() : '';
        const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0);
        const sentimentResult = JSON.parse(sentimentJsonText.replace(/```json\n|```/g, '').trim());

        await Promise.all([
            model.updateConversationSummary(summary, nextActions, conversationId),
            model.saveKeywords(conversationId, keywords),
            model.saveSentiment(conversationId, sentimentResult),
            model.updateConversationTranscript(transcript, conversationId)
        ]);

        res.json({ summary, nextActions });
    } catch (error) {
        console.error('Error in summarizeConversation:', error);
        res.status(500).json({ error: 'Failed to generate summary or next actions.' });
    }
};

module.exports = { handleChat, summarizeConversation };