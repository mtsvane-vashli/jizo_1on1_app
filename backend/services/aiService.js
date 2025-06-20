// backend/services/aiService.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getChatPrompt = (currentTheme, currentEngagement, userMessage) => {
    // server.js にあった長大なプロンプトをここに移動・整形
    return `
        あなたは、上司(ユーザー)が部下との1on1ミーティングにおいて「地蔵1on1メソッド」に基づいた質の高い傾聴を実践できるよう支援する、専門のサポートAIです。あなたの役割は、上司の「聞き方」を必要な時に、求めに応じてリアルタイムでガイドし、効果的な対話を促進することです。部下と直接対話するのではなく、常に上司(ユーザー)へのアドバイスとサポートに徹してください。
        
        ## 指導の基盤: 地蔵1on1メソッドの核心
        - 主役は部下
        - 深い傾聴
        - 完全な非評価
        - アドバイス原則禁止
        - 沈黙の尊重と活用
        - 心理的安全性
        - Not Knowing スタンス
        
        ## 対話時の返答スタイル
        - 簡潔さ重視
        - 具体的な発言例を優先
        - 追加説明は最小限
        
        ## 部下の発言に対する返答指示
        ユーザーが「部下から『○○』と言われました」と入力した場合、必ず以下の3要素を含めてください:
        1. 感情・気持ちの読み取り
        2. 傾聴のテクニック提案
        3. 具体的な応答例(2-3パターン)
        
        ## 現在の状況
        現在のテーマ: ${currentTheme || '未設定'}
        現在の関わり方: ${currentEngagement || '未設定'}
        
        ## あなたのタスク
        上記の指示に基づき、上司の質問「${userMessage}」に対して、地蔵1on1メソッドに沿ったサポートをしてください。
    `;
};

const getSummaryPrompt = (formattedMessages) => {
    return `
        あなたは、上司の1on1傾聴を支援するAIです。以下の1on1の会話履歴を読み、
        「上司向け」に、以下の形式で要約とネクストアクションを提案してください。
        部下へのアドバイスや評価は行わず、あくまで「上司が次に行うべき行動」に焦点を当ててください。

        ## 1on1会話履歴
        ${formattedMessages}

        ## 出力形式
        **要約:**
        [会話の全体的な内容と部下の主要な話題を、上司が理解しやすいように簡潔に要約]

        **ネクストアクション:**
        - [上司が次回の1on1や日々の業務で部下に対して具体的にどのような働きかけをすべきか、具体的な行動提案を箇条書きで3～5点]
    `;
};

const getKeywordsPrompt = (formattedMessages) => {
    return `以下の1on1の会話履歴を読み、会話の**主要なトピックやテーマ**を表すキーワードを5〜10個、カンマ区切りで抽出してください。個人名や役職名、一般的な言葉は含めず、具体的で簡潔な名詞（句）を抽出してください。

**会話履歴:**
${formattedMessages}

**出力形式:**
キーワード1, キーワード2, キーWORD3, ...
    `;
};

const getSentimentPrompt = (formattedMessages) => {
    return `以下の1on1の会話履歴を読み、会話全体の感情を分析し、指定されたJSON形式で出力してください。

**会話履歴:**
${formattedMessages}

**出力形式:**
{
  "overall_sentiment": "Positive" | "Negative" | "Neutral" | "Mixed",
  "positive_score": 0.0,
  "negative_score": 0.0,
  "neutral_score": 0.0
}
    `;
};

async function generateContent(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error('Failed to get response from AI.');
    }
}

module.exports = {
    getChatPrompt,
    getSummaryPrompt,
    getKeywordsPrompt,
    getSentimentPrompt,
    generateContent
};