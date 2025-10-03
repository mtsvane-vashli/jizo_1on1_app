const { GoogleGenerativeAI } = require('@google/generative-ai');
const { SpeechClient } = require('@google-cloud/speech');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const speechClient = new SpeechClient();
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
あなたは、1on1を実施する上司を支援するコーチングAIです。
以下の会話履歴と1on1情報に基づき、部下の発言から読み取れる心情・意図を推察しながら、上司が次にどう関わるべきかを助言してください。

# 1on1情報
- テーマ: ${theme}
- 関わり方: ${stance}

# これまでの会話
${formattedHistory}

# 指示
- 応答は必ず下記のJSON形式で出力してください。
- response_textは上司に向けたメモとして以下の2段落構成にしてください。
  1. 「部下の状態推察: ...」の形式で、部下が何を感じていそうか・どのように捉えていそうかを推察し、必要に応じて「」を用いて印象的な発言を引用する。
  2. 「上司への提案: ...」の形式で、上司が意識したい配慮や次の働きかけを端的に助言する。
- response_text内では部下本人に直接話しかけず、上司視点の表現にする。
- suggested_questionsには、会話の流れを汲み取り、部下の内省を促すオープンクエスチョンを3つ格納してください。問いの意図が上司にとって分かりやすいよう、必要に応じて「〜の背景を確かめる」「〜の希望を明らかにする」のような補足を括弧で付けても構いません。
- suggested_questionsの最後に「その他（自由に質問する）」という選択肢を必ず加えてください。
- 質問は全て日本語のオープンクエスチョンにしてください。

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
        あなたは、1on1を実施する上司をサポートするエグゼクティブコーチです。以下の「AIとのチャット履歴」と「1on1の文字起こし」を分析し、上司が短時間で状況を把握し、次アクションを決められるレポートをMarkdownで作成してください。

        文字起こしを分析する際は、雑談や誤認識された語句を除き、業務・心理・コンディションに関わる重要情報にフォーカスしてください。部下を評価したり断定せず、推察であることを明示しながら上司の行動に焦点を当ててください。

        ## AIとのチャット履歴
        ${formattedMessages}

        ## 1on1の文字起こし
        ${transcript}

        ## 出力フォーマット（日本語 / Markdown）
        **ハイライト（最大3件）**
        - [部下の状態や重要トピックを40〜80文字で。冒頭に太字でキーワードを付けてもよい]
        - [...]
        - [...]

        **部下の背景と意図（200〜300文字）**
        - [上司視点で把握しておきたい背景・文脈を箇条書き2〜3点。必要に応じて「」で該当発言を引用]

        **ネクストアクション（3件以内）**
        - [上司が取れる具体的な働きかけを70文字以内で。動詞始まりで端的に]
        - [...]
        - [...]

        **フォローのヒント（任意 1〜2行）**
        - [継続フォローの際の留意点や確認したい観点。必要な場合のみ記載]
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

// Deep dive prompt: explain clicked text in context
const getDeepDivePrompt = (queryText, context) => {
  const { theme, engagement, summary, nextActions, transcript, messages } = context || {};
  const formattedHistory = (messages || [])
    .map((m) => `${m.sender === 'user' ? '上司' : (m.sender === 'employee' ? '部下' : 'AI')}: ${m.message}`)
    .join('\n');

  return `あなたは、1on1を実施する上司を支援するエグゼクティブコーチです。以下の情報を踏まえ、指定されたテキストから「部下が何を感じ・考えているのか」を推察しつつ、上司がどう捉え、どう動くべきかを明確に示してください。

【1on1メタ】
- テーマ: ${theme || '不明'}
- 関わり方: ${engagement || '不明'}

【要約】
${summary || '（要約なし）'}

【ネクストアクション】
${nextActions || '（提案なし）'}

【会話履歴（要約的）】
${formattedHistory || '（履歴なし）'}

【文字起こし（抜粋可）】
${(transcript || '').slice(0, 4000)}

【深掘り対象テキスト】
${queryText}

出力はMarkdownで、以下の見出し構成・分量（350~600字程度）を目安に日本語で記述してください。箇条書きは必ず「- 」で始めてください。引用や根拠に使える箇所があれば「」で会話や要約の該当フレーズを引用してください。

### 部下が伝えたいこと（推察）
- 部下が何を感じ・考えていそうかを2〜3点。根拠となる発言や状況があれば引用しつつ、「〜と捉えている可能性」「〜と感じていると考えられます」のように推察であることを明示する。

### 上司として汲み取りたい視点
- 上司が見落としがちなサインや、配慮すべき背景・リスクを2点以上。部下の心理的安全性・モチベーション・負荷などの観点で言及し、「上司として〜を意識すると良いでしょう」のように助言する。

### 対話を深める問いかけ例
- 上司が次に投げられるオープンクエスチョンを2〜3個。部下の内面や価値観を引き出せるよう、「どのあたりが一番負担になっていますか？」のような具体的な日本語で。

### フォローアップ行動（具体例）
- 上司が取れる具体策・フォロー（1on1内外での働きかけ）を2〜3点。「まず〜を確認する」「〜の場を設定する」など、実践しやすい行動レベルで提示する。
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

function setupTranscriptionStream(onTranscription, options = {}) {
  const { onRestartRequest } = options;
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

  const MAX_STREAM_DURATION_MS = 4 * 60 * 1000; // stay below 305s API limit
  const ROTATION_SAFETY_MS = 10 * 1000; // rotate slightly before hitting limit

  let recognizeStream = null;
  let streamStartedAt = 0;
  let managerDestroyed = false;
  let rotationTimer = null;

  const handleStreamData = (data) => {
    if (data.results?.[0]?.alternatives?.[0]) {
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
  };

  const clearRotationTimer = () => {
    if (rotationTimer) {
      clearTimeout(rotationTimer);
      rotationTimer = null;
    }
  };

  const requestRestart = (reason = 'manual') => {
    if (managerDestroyed) {
      return;
    }
    managerDestroyed = true;
    clearRotationTimer();
    if (recognizeStream) {
      recognizeStream.removeAllListeners();
      try {
        recognizeStream.destroy();
      } catch (error) {
        console.error('Failed to destroy recognize stream:', error);
      }
      recognizeStream = null;
    }
    console.info(`Requesting Speech-to-Text stream restart (reason: ${reason})`);
    if (typeof onRestartRequest === 'function') {
      setImmediate(() => onRestartRequest(reason));
    }
  };

  const handleStreamError = (err) => {
    console.error('Speech-to-Text API Error:', err);
    if (managerDestroyed) {
      return;
    }
    if (err && err.code === 11) {
      requestRestart('api-limit');
    } else {
      requestRestart(`api-error-${err?.code ?? 'unknown'}`);
    }
  };

  const createStream = () => {
    if (managerDestroyed) {
      return;
    }
    clearRotationTimer();
    recognizeStream = speechClient.streamingRecognize({
      config: {
        ...requestConfig,
        enableAutomaticPunctuation: true,
      },
      interimResults: true,
    });

    recognizeStream.on('error', handleStreamError);
    recognizeStream.on('data', handleStreamData);
    streamStartedAt = Date.now();
    rotationTimer = setTimeout(() => {
      requestRestart('timer');
    }, Math.max(1000, MAX_STREAM_DURATION_MS - ROTATION_SAFETY_MS));
  };

  const write = (audioData) => {
    if (managerDestroyed) {
      return;
    }

    if (!recognizeStream || recognizeStream.destroyed) {
      requestRestart('stream-missing');
      return;
    }

    if (Date.now() - streamStartedAt >= MAX_STREAM_DURATION_MS - ROTATION_SAFETY_MS) {
      requestRestart('duration');
      return;
    }

    try {
      recognizeStream.write(audioData);
    } catch (error) {
      console.error('Failed to write audio data to recognize stream:', error);
      requestRestart('write-failed');
    }
  };

  const destroy = () => {
    managerDestroyed = true;
    clearRotationTimer();
    if (recognizeStream) {
      recognizeStream.removeAllListeners();
      try {
        recognizeStream.destroy();
      } catch (error) {
        console.error('Failed to destroy recognize stream:', error);
      }
      recognizeStream = null;
    }
  };

  createStream();

  return {
    write,
    destroy,
    get destroyed() {
      return managerDestroyed;
    }
  };
}

module.exports = {
  generateInitialMessage,
  generateFollowUp,
  getSummaryPrompt,
  getDeepDivePrompt,
  getKeywordsPrompt,
  getSentimentPrompt,
  getIssuesSummaryPrompt,
  getPositivesSummaryPrompt,
  generateContent,
  setupTranscriptionStream
};
