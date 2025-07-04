// backend/services/aiService.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * チャット用のプロンプトを生成する
 * @param {string} currentTheme - 現在のテーマ
 * @param {string} currentEngagement - 現在の関わり方
 * @param {string} userMessage - ユーザーの最新メッセージ
 * @param {Array<object>} chatHistory - これまでの会話履歴の配列 // ★ 引数を追加
 * @returns {string} 生成されたプロンプト
 */
const getChatPrompt = (currentTheme, currentEngagement, userMessage, chatHistory = []) => {
    // ★ 会話履歴をAIが読みやすいテキスト形式に変換する
    const formattedHistory = chatHistory
        .map(msg => `${msg.sender === 'user' ? '上司' : 'AI'}: ${msg.text}`)
        .join('\n');

    // ★ プロンプトに「これまでの会話履歴」セクションを追加
    return `
        あなたは、上司(ユーザー)が部下との1on1ミーティングにおいて「地蔵1on1メソッド」に基づいた質の高い傾聴を実践できるよう支援する、専門のサポートAIです。あなたの役割は、上司の「聞き方」を必要な時に、求めに応じてリアルタイムでガイドし、効果的な対話を促進することです。部下と直接対話するのではなく、常に上司(ユーザー)へのアドバイスとサポートに徹してください。

        ## 指導の基盤: 地蔵1on1メソッドの核心 (あなたの判断基準)
        - 主役は部下: 部下が安心して本音を話せる場を作る。
        - 深い傾聴: 言葉の背景にある感情、価値観まで感じ取る。
        - 完全な非評価: 「良い/悪い」のレッテルを貼らず、ありのまま受け止める。
        - アドバイス原則禁止: 部下の思考停止や主体性の喪失を招く安易なアドバイスはしない。
        - 沈黙の尊重: 沈黙は部下が深く考えるための貴重な時間。

        ## 現在の1on1の状況
        現在のテーマ: ${currentTheme || '未設定'}
        現在の関わり方: ${currentEngagement || '未設定'}

        ## これまでの会話履歴
        ${formattedHistory}

        ## あなたのタスク
        上記の全ての情報を踏まえ、上司からの以下の新しいメッセージ（相談）に対して、地蔵1on1メソッドに沿った最も的確なサポート（具体的な応答例や質問の提案など）を、簡潔に提供してください。

        上司の新しいメッセージ: "${userMessage}"
    `;
};


const getSummaryPrompt = (formattedMessages, transcript) => {
    return `
        あなたは、上司の1on1傾聴を支援するAIです。以下の「AIとのチャット履歴」と「1on1の文字起こし」を読み、
        「上司向け」に、以下の形式で要約とネクストアクションを提案してください。
        部下へのアドバイスや評価は行わず、あくまで「上司が次に行うべき行動」に焦点を当ててください。

        ## AIとのチャット履歴
        ${formattedMessages}

        ## 1on1の文字起こし
        ${transcript}

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

// ★ Speech-to-Text APIのクライアントをインポート
const { SpeechClient } = require('@google-cloud/speech');
const speechClient = new SpeechClient();

/**
 * リアルタイム文字起こしのためのストリームをセットアップする関数
 * @param {function} onTranscription - 文字起こし結果が得られたときに呼び出されるコールバック関数
 * @returns {object} - startとstopメソッドを持つストリームハンドラオブジェクト
 */
function setupTranscriptionStream(onTranscription) {
  const requestConfig = {
    encoding: 'WEBM_OPUS', // MediaRecorderのデフォルトに合わせて調整
    sampleRateHertz: 48000, // 一般的なマイクのサンプルレート
    languageCode: 'ja-JP',  // 日本語
    diarizationSpeakerCount: 2,
    enableAutomaticPunctuation: true,
    enableSpeakerDiarization: true,
    enableWordTimeOffsets: true,
    model: 'telephony'
  };

  const recognizeStream = speechClient
    .streamingRecognize({
      config: {
        ...requestConfig,
        enableAutomaticPunctuation: true, // 自動で句読点を付与
      },
      interimResults: true, // 翻訳の途中結果を取得する
    })
    .on('error', (err) => {
      console.error('Speech-to-Text API Error:', err);
    })
    .on('data', (data) => {
      if (data.results[0] && data.results[0].isFinal && data.results[0].alternatives[0].words.length > 0) {
        
        const result = data.results[0].alternatives[0];
        const words = result.words;

        // 話者タグごとに発言をグループ化する
        const transcriptions = [];
        let currentSpeaker = words[0].speakerTag;
        let currentTranscript = '';

        words.forEach(wordInfo => {
          if (wordInfo.speakerTag === currentSpeaker) {
            currentTranscript += wordInfo.word.replace(/▁/g, '');
          } else {
            transcriptions.push({ speakerTag: currentSpeaker, transcript: currentTranscript.trim() });
            currentSpeaker = wordInfo.speakerTag;
            currentTranscript = wordInfo.word.replace(/▁/g, '');
          }
        });
        transcriptions.push({ speakerTag: currentSpeaker, transcript: currentTranscript.trim() });

        // グループ化した発言をコールバックで一つずつ渡す
        transcriptions.forEach(transcription => {
            onTranscription({
                speakerTag: transcription.speakerTag,
                transcript: transcription.transcript
            });
        });
      }
    });

  return recognizeStream;
}

module.exports = {
    getChatPrompt,
    getSummaryPrompt,
    getKeywordsPrompt,
    getSentimentPrompt,
    generateContent,
    setupTranscriptionStream
};