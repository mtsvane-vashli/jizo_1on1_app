// frontend/src/views/LearningResources.js (修正後 - Tailwindなし)
import React from 'react';

function LearningResources() {
  return (
    <div className="view-container"> {/* クラス名変更 */}
      <h2 className="screen-header">学習リソース</h2> {/* クラス名変更 */}
      <p className="screen-description mb-8">1on1の質を高めるためのヒント集です。</p> {/* クラス名変更 */}

      <div className="resource-card"> {/* クラス名変更 */}
        <h3 className="text-xl font-semibold mb-4">地蔵1on1メソッドの核心</h3> {/* クラス名変更 */}
        <ul className="list-disc pl-5 space-y-2 text-gray-800"> {/* この行は一部Tailwind風の記述が残っていますが、App.cssで調整済み */}
          <li>
            <strong>主役は部下</strong> 部下が「自分のための時間だ」と感じる場を作る。
          </li>
          <li>
            <strong>アドバイス原則禁止</strong> 安易な助言は部下の思考停止を招く。「あなたならどうする？」と問う。
          </li>
          <li>
            <strong>沈黙の尊重</strong> 沈黙は部下が深く考えるための貴重な時間。焦らず待つ。
          </li>
          <li>
            <strong>完全な非評価</strong> 「良い/悪い」で判断せず、ありのままを受け止める。
          </li>
        </ul>
      </div>

      <div className="resource-card"> {/* クラス名変更 */}
        <h3 className="text-xl font-semibold mb-4">困ったときの質問例</h3> {/* クラス名変更 */}
        <ul className="list-disc pl-5 space-y-2 text-gray-800"> {/* この行は一部Tailwind風の記述が残っていますが、App.cssで調整済み */}
          <li>「その時、具体的に何がありましたか？」(事実確認)</li>
          <li>「その出来事を、どう捉えていますか？」(思考・解釈)</li>
          <li>「本当はどうなってほしいですか？」(未来・理想)</li>
          <li>「この状況を乗り越えるために、どんな強みが活かせそうですか？」(強み・リソース)</li>
        </ul>
      </div>
    </div>
  );
}

export default LearningResources;