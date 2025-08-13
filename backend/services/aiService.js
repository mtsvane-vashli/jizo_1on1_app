const { GoogleGenerativeAI } = require('@google/generative-ai');
const { SpeechClient } = require('@google-cloud/speech');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const speechClient = new SpeechClient();
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * AIの応答からJSONオブジェクトを安全に抽出します。
 * @param {string} text - AIが生成したテキスト。
 * @returns {object} 抽出されたJSONオブジェクト。
 */
const parseJsonResponse = (text) => {
  try {
    // マークダウンのコードブロック形式 (```json ... ```) からJSON文字列を抽出
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    // コードブロックがない場合、直接パースを試みる
    return JSON.parse(text);
  } catch (error) {
    console.error("AI応答からのJSONパースに失敗しました:", error);
    // パース失敗時は、フォールバックとしてテキスト部分のみを返す
    return {
      response_text: text.replace(/```json\n([\s\S]*?)\n```/, '').trim() || "申し訳ありません、応答を正しく処理できませんでした。",
      suggested_questions: []
    };
  }
};

/**
 * 新しい会話の開始時に、AIの導入メッセージと最初の質問候補を生成します。
 * @param {string} employeeName - 部下の名前。
 * @param {string} theme - 1on1のテーマ。
 * @param {string} stance - マネージャーの関わり方。
 * @returns {Promise<object>} AIの応答テキストと質問候補を含むオブジェクト。
 */
const generateInitialMessage = async (employeeName, theme, stance) => {
  const prompt = `
あなたは、マネージャーの1on1を支援するAIアシスタントです。
以下の情報に基づき、1on1の導入メッセージと、最初の質問候補を生成してください。

# 1on1情報
- 部下の名前: ${employeeName}
- テーマ: ${theme}
- 関わり方: ${stance}

# 指示
- 応答は必ず下記のJSON形式で出力してください。
- response_textには、マネージャーを励ます導入メッセージと簡単な説明を入れてください。「承知いたしました。選択いただいたテーマと関わり方を念頭に置き、サポートさせていただきます。本日はこのテーマと関わり方で進めてまいります。それでは、1on1を進めてください。私はここで待機しています。サポートが必要になったらいつでも、このチャットに状況や疑問を具体的にお知らせください。」のような形式で記述してください。
- suggested_questionsには、テーマと関わり方を踏まえた具体的な質問を3つ格納してください。
- suggested_questionsの最後に「その他（自由に質問する）」という選択肢を必ず加えてください。

# 出力形式 (JSON)
\`\`\`json
{
  "response_text": "string",
  "suggested_questions": [
    "string",
    "string",
    "string",
    "その他（自由に質問する）"
  ]
}
\`\`\`
`;
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return parseJsonResponse(response.text());
};

/**
 * 会話の途中で、次の応答と質問候補を生成します。
 * @param {Array<object>} history - これまでの会話履歴。
 * @param {string} theme - 1on1のテーマ。
 * @param {string} stance - マネージャーの関わり方。
 * @returns {Promise<object>} AIの応答テキストと質問候補を含むオブジェクト。
 */
const generateFollowUp = async (history, theme, stance) => {
  const formattedHistory = history.map(msg => `${msg.sender === 'user' ? 'マネージャー' : '部下'}: ${msg.message}`).join('\n');
  const prompt = `
あなたは、マネージャーの1on1を支援するAIアシスタントです。
以下の会話履歴と1on1情報に基づき、マネージャーへの短いアドバイスと、次の効果的な質問候補を3つ生成してください。

# 1on1情報
- テーマ: ${theme}
- 関わり方: ${stance}

# これまでの会話
${formattedHistory}

# 指示
- 応答は必ず下記のJSON形式で出力してください。
- response_textには、部下の最後の発言に対する相槌や、マネージャーへの短いアドバイスを記述してください。
- suggested_questionsには、会話の流れを汲み取り、部下の内省を促す質問を3つ格納してください。
- suggested_questionsの最後に「その他（自由に質問する）」という選択肢を必ず加えてください。
- 質問はオープンクエスチョンにしてください。

# 出力形式 (JSON)
\`\`\`json
{
  "response_text": "string",
  "suggested_questions": [
    "string",
    "string",
    "string",
    "その他（自由に質問する）"
  ]
}
\`\`\`
`;
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return parseJsonResponse(response.text());
};


// --- 以下、元のファイルにあった他のAI関連関数 ---

const getSummaryPrompt = (formattedMessages, transcript) => {
  return `
        あなたは、上司の1on1傾聴を支援するAIです。以下の「AIとのチャット履歴」と「1on1の文字起こし」を読み、
        「上司向け」に、以下の形式で要約とネクストアクションを提案してください。
        文字起こしを分析する際、**「文字起こしAPIが間違って文字起こしした関係ない語句」や「仕事と関係ない雑談」は内容から除外し、業務に関する重要な会話に絞って**要約と提案を作成してください。
        部下へのアドバイスや評価は行わず、あくまで「上司が次に行うべき行動」に焦点を当ててください。

        ## AIとのチャット履歴
        ${formattedMessages}

        ## 1on1の文字起こし
        ${transcript}

        ## 出力形式
        **要約:**
        [会話の全体的な内容と部下の主要な話題を、上司が理解しやすいように500文字程度で要約]

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

const getIssuesSummaryPrompt = (transcript, conversationId) => {
  return `あなたは優秀な会話分析コンサルタントです。以下の1on1の文字起こしテキストを分析し、部下が表明している「課題・懸念事項」を最大3つ抽出してください。
各項目は、「〇〇に関する課題」や「△△についての悩み」といった形式で、25文字以内の簡潔なタイトルに要約してください。
抽出した結果を、以下のJSON形式の配列で厳密に出力してください。
重要: 該当する課題がない場合は、必ず空の配列 [] を出力してください。説明文は不要です。

\`\`\`json
[
  { "conversation_id": ${conversationId}, "text": "要約した課題タイトル1" },
  { "conversation_id": ${conversationId}, "text": "要約した課題タイトル2" }
]
\`\`\`

--- 文字起こしテキスト ---
${transcript}
`;
};

const getPositivesSummaryPrompt = (transcript, conversationId) => {
  return `あなたは優秀な会話分析コンサルタントです。以下の1on1の文字起こしテキストを分析し、部下が表明している「ポジティブな変化・成長」に関するトピックを最大3つ抽出してください。
各項目は、「〇〇での成功体験」や「△△に関する成長実感」といった形式で、25文字以内の簡潔なタイトルに要約してください。
抽出した結果を、以下のJSON形式の配列で厳密に出力してください。
重要: 該当するトピックがない場合は、必ず空の配列 [] を出力してください。説明文は不要です。

\`\`\`json
[
  { "conversation_id": ${conversationId}, "text": "要約したポジティブなトピック1" },
  { "conversation_id": ${conversationId}, "text": "要約したポジティブなトピック2" }
]
\`\`\`

--- 文字起こしテキスト ---
${transcript}
`;
};

async function generateContent(prompt) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    // AIの応答からJSON部分だけをより確実に抽出する処理
    const text = response.text();
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})|(\[[\s\S]*\])/);
    if (jsonMatch) {
      return jsonMatch[1] || jsonMatch[2] || jsonMatch[3] || text;
    }
    return text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to get response from AI.');
  }
}

function setupTranscriptionStream(onTranscription) {
  const requestConfig = {
    encoding: 'WEBM_OPUS',
    sampleRateHertz: 48000,
    languageCode: 'ja-JP',
    enableAutomaticPunctuation: true,
    model: 'latest_long',
    speechContexts: [{
      phrases: [],
      boost: 20
    }],
    enableSpeakerDiarization: true,
    diarizationSpeakerCount: 2,
  };

  const recognizeStream = speechClient
    .streamingRecognize({
      config: {
        ...requestConfig,
        enableAutomaticPunctuation: true,
      },
      interimResults: true,
    })
    .on('error', (err) => {
      console.error('Speech-to-Text API Error:', err);
    })
    .on('data', (data) => {
      if (data.results[0] && data.results[0].alternatives[0]) {
        const result = data.results[0];
        const transcript = result.alternatives[0].transcript;

        let speakerTag = null;
        if (result.alternatives[0].words && result.alternatives[0].words.length > 0) {
          speakerTag = result.alternatives[0].words[0].speakerTag;
        }

        if (transcript) {
          onTranscription({
            transcript: transcript.trim(),
            speakerTag: speakerTag,
            isFinal: result.isFinal
          });
        }
      }
    });

  return recognizeStream;
}

module.exports = {
  generateInitialMessage,
  generateFollowUp,
  getSummaryPrompt,
  getKeywordsPrompt,
  getSentimentPrompt,
  getIssuesSummaryPrompt,
  getPositivesSummaryPrompt,
  generateContent,
  setupTranscriptionStream
};
