// frontend/src/views/LearningResources.js
import React from 'react';
import layoutStyles from '../App.module.css';
import styles from './LearningResources.module.css';

function LearningResources() {
  return (
    <div className={layoutStyles.viewContainer}>
      <h2 className={layoutStyles.screenHeader}>学習リソース</h2>
      <p className={layoutStyles.screenDescription}>1on1の質を高めるためのヒント集です。</p>

      <div className={styles.card}>
        <h3>地蔵1on1メソッドの核心</h3>
        <ul>
          <li>
            <strong>主役は部下</strong>: 部下が「自分のための時間だ」と感じる場を作ることが最も重要です。
          </li>
          <li>
            <strong>アドバイス原則禁止</strong>: 安易な助言は部下の思考停止を招きます。「あなたならどうする？」と問い、内省を促しましょう。
          </li>
          <li>
            <strong>沈黙の尊重</strong>: 沈黙は部下が深く考えるための貴重な時間です。焦らず、急かさず、じっと待つ姿勢が信頼を生みます。
          </li>
          <li>
            <strong>完全な非評価</strong>: 「良い/悪い」で判断せず、部下の発言や感情をありのまま受け止めましょう。
          </li>
        </ul>
      </div>

      <div className={styles.card}>
        <h3>困ったときの質問例</h3>
        <ul>
          <li>「その時、具体的に何がありましたか？」(事実確認)</li>
          <li>「その出来事を、どう捉えていますか？」(思考・解釈の確認)</li>
          <li>「本当はどうなってほしいと願っていますか？」(未来・理想の探求)</li>
          <li>「この状況を乗り越えるために、どんなご自身の強みが活かせそうですか？」(強み・リソースへの着目)</li>
        </ul>
      </div>
    </div>
  );
}

export default LearningResources;