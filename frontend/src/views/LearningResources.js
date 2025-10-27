// frontend/src/views/LearningResources.js
import React, { useState } from 'react';
import layoutStyles from '../App.module.css';
import styles from './LearningResources.module.css';
import { FiDownload } from 'react-icons/fi';

// SVGのシンプルなChevronアイコン
const ChevronIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

// アコーディオンの各アイテム（見出し右側にアクションを置けるように拡張）
const AccordionItem = ({ title, right, children, isOpen, onClick }) => {
  return (
    <div className={styles.accordionItem}>
      <button className={styles.accordionTitle} onClick={onClick}>
        <span className={styles.accordionTitleText}>{title}</span>
        {/* 右側アクション（ダウンロードボタンなど） */}
        {right && (
          <span
            className={styles.accordionRight}
            onClick={(e) => {
              // 見出しクリックでの開閉を止め、右側のボタンクリックだけを通す
              e.stopPropagation();
            }}
          >
            {right}
          </span>
        )}
        <ChevronIcon
          className={`${styles.accordionIcon} ${isOpen ? styles.open : ''}`}
        />
      </button>
      <div
        className={`${styles.accordionContent} ${isOpen ? styles.open : ''
          }`}
      >
        <div className={styles.accordionContentInner}>{children}</div>
      </div>
    </div>
  );
};

// 学習ガイド
function LearningResources() {
  const [openIndex, setOpenIndex] = useState(null);

  const handleAccordionClick = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // ルート相対（/assets/...）で public/assets のPDFを参照
  const DL_JYOUSHI = '/assets/1on1_guide_jyoushi.pdf';
  const DL_BUKA = '/assets/1on1_guide_buka.pdf';

  return (
    <div className={layoutStyles.viewContainer}>
      <h2 className={layoutStyles.screenHeader}>学習ガイド</h2>
      <p className={layoutStyles.screenDescription}>
        「地蔵型1on1」をうまく進めるための、上司（聞き手）と部下（話し手）それぞれに向けたやさしいガイドです。
      </p>

      <div className={styles.accordion}>
        {/* 上司（聞き手）向け */}
        <AccordionItem
          title="地蔵型1on1 ガイド：上司（聞き手）向け"
          isOpen={openIndex === 0}
          onClick={() => handleAccordionClick(0)}
          right={
            <a
              href={DL_JYOUSHI}
              className={styles.downloadBtn}
              aria-label="上司向けガイドをダウンロード"
              download
              target="_blank"
              rel="noopener noreferrer"
              title="上司向けガイド（PDF）をダウンロード"
            >
              <FiDownload className={styles.downloadIcon} />
              <span>ダウンロード</span>
            </a>
          }
        >
          <h3>1. 「地蔵型1on1」の考え方</h3>
          <p>
            「地蔵型1on1」は、部下の自律的な成長を引き出し、チームを元気にしていくためのシンプルな方法です。
            いちばん大切なのは、上司がたくさん話すのではなく、落ち着いて「待って、聴く」姿勢に徹することです。
          </p>

          <h4>1.1. 基本の姿勢</h4>
          <p>
            地蔵のように静かに見守り、相手の言葉や気持ちをそのまま受けとめましょう。安心して本音を話せる場ができると、
            部下は自分で考え、気づき、動けるようになります。この時間は、部下だけでなく上司の心も満たす
            「しあわせのバケツ」を満たす時間にもなります。
          </p>

          <h4>1.2. 目的</h4>
          <ul>
            <li>・心理的安全性をつくり、本音を引き出しましょう。</li>
            <li>・内省を促し、自己解決力（経験学習）を高めていきましょう。</li>
            <li>・上司と部下の信頼関係を強くしていきましょう。</li>
            <li>・主体性とエンゲージメントを育てましょう。</li>
            <li>・上司の傾聴力・質問力を伸ばし、自己理解を深めましょう。</li>
            <li>・対話を通じて、お互いの「しあわせのバケツ」を満たしましょう。</li>
          </ul>

          <h4>1.3. 特徴</h4>
          <ul>
            <li><strong>シンプル:</strong> マインドセット重視で続けやすい。</li>
            <li><strong>非評価:</strong> 判断せず、まず受けとめる。</li>
            <li><strong>沈黙を大事に:</strong> 考えが深まる時間として扱う。</li>
            <li><strong>伴走支援:</strong> 導入後のフォローやコミュニティで継続しやすい。</li>
          </ul>

          <h3>2. 従来の1on1とのちがい</h3>
          <p>地蔵型1on1は、目的も関わり方もシンプルに「聴く」へ寄せていく。</p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>観点</th>
                <th>従来の1on1</th>
                <th>地蔵型1on1</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>主導権</td>
                <td>上司が主導し、助言・指示が中心になりがち。</td>
                <td>部下が主役で、上司は聴くことに徹する。</td>
              </tr>
              <tr>
                <td>主目的</td>
                <td>課題解決や次の行動決めが中心。</td>
                <td>内省と自己理解の深まりを大切にする。</td>
              </tr>
              <tr>
                <td>重視点</td>
                <td>結論やアクションを重視しがち。</td>
                <td>対話そのものの質を重視。</td>
              </tr>
              <tr>
                <td>沈黙</td>
                <td>埋めるべき空白として扱われがち。</td>
                <td>考えるための大切な時間として扱う。</td>
              </tr>
              <tr>
                <td>上司の役割</td>
                <td>自分の経験から解決策を提示しがち。</td>
                <td>部下が答えにたどり着くまで待つ。</td>
              </tr>
            </tbody>
          </table>

          <h3>3. 導入で得られる5つのよいこと</h3>
          <h4>3.1. 人材育成の質が上がる</h4>
          <p>
            「指示待ち」から「自分で考えて動く」へと変わっていく。自己理解が深まり（ジョハリの窓が開くイメージ）、
            経験からの学びが回りやすくなって「Aha!」が増える。
          </p>

          <h4>3.2. 離職の抑制・エンゲージメント向上</h4>
          <p>
            「わかってもらえている」という実感が、貢献意欲やコミットを高める。孤独感や不安が和らぎ、
            発言の変化などから早めにサインを見つけやすくなる。
          </p>

          <h4>3.3. 現場コミュニケーションが活性化</h4>
          <p>
            1on1での深い理解がチーム全体にも広がる。情報共有の質とスピードが上がり、風通しのよい文化が育つ。
          </p>

          <h4>3.4. 心理的安全性の確保</h4>
          <p>
            失敗を恐れずに話せる空気が、意見表明やチャレンジを後押し。イノベーションの土台になる。
          </p>

          <h4>3.5. 上司のスキルと負担感の質が変わる</h4>
          <p>
            傾聴・質問などの複合スキルが育つ。マイクロマネジメントから離れ、個々に合わせた育成ができるため、
            上司自身の手応えややりがいも増えていく。
          </p>

          <h3>4. キーワード：「しあわせのバケツ」</h3>
          <p>
            対話を通じて、部下の気づきや成長を一緒に喜ぶことで、上司の心も満たされるという考え方。
            仕事の効率だけでなく、人としての豊かさも育てる関係づくりを目指す。
          </p>

          <h3>5. 実践のコツ</h3>
          <h4>5.1. 環境づくり</h4>
          <ul>
            <li>・静かで中断されにくい場所を選ぶ。</li>
            <li>・正対しすぎない配置（例：90度）にすると圧迫感が減って話しやすい。</li>
            <li>・スマホはオフにして、相手だけを見る。</li>
          </ul>

          <h4>5.2. 基本スタンス</h4>
          <ul>
            <li>・批判・評価は控え、まず受けとめる。</li>
            <li>・話を遮らない。</li>
            <li>・沈黙を恐れず、相手のペースを尊重する。</li>
          </ul>

          <h4>5.3. 注意点</h4>
          <ul>
            <li>・評価面談と1on1の目的は分けて扱う。</li>
            <li>・急いで「正解」を出そうとしない。</li>
            <li>・1回で完結を狙わず、続けることを大切にする。</li>
          </ul>

          <h3>6. よくある質問（上司向け）</h3>
          <dl>
            <dt>Q. 実施頻度は？</dt>
            <dd>A. 週1〜隔週で15〜30分が目安。大事なのは頻度より継続。</dd>

            <dt>Q. まったく助言しないほうがいい？</dt>
            <dd>
              A. 基本は「聴く・待つ」。ただし、部下が明確に助言を求めたときや
              育成上必要なフィードバックは、タイミングを見て適切に行う。
            </dd>

            <dt>Q. 相手が話してくれないときは？</dt>
            <dd>
              A. まずは安心感づくりから。沈黙を恐れず、急かさないことが大切。
              研修や伴走支援も活用すると始めやすい。
            </dd>

            <dt>Q. ありがちな失敗は？</dt>
            <dd>
              A. 沈黙に耐えられず話してしまう／最後まで聴かずに助言してしまう／
              早く結論を迫ってしまう、などに注意。
            </dd>
          </dl>
        </AccordionItem>

        {/* 部下（話し手）向け */}
        <AccordionItem
          title="地蔵型1on1 ガイド：部下（話し手）向け"
          isOpen={openIndex === 1}
          onClick={() => handleAccordionClick(1)}
          right={
            <a
              href={DL_BUKA}
              className={styles.downloadBtn}
              aria-label="部下向けガイドをダウンロード"
              download
              target="_blank"
              rel="noopener noreferrer"
              title="部下向けガイド（PDF）をダウンロード"
            >
              <FiDownload className={styles.downloadIcon} />
              <span>ダウンロード</span>
            </a>
          }
        >
          <h3>1. 「地蔵型1on1」とは：あなたのための時間</h3>
          <p>
            1on1は、あなたと上司が定期的に1対1で話す時間。この時間は、ほかの誰でもない
            「あなたのための時間」だと考えて、安心して活用していこう。
          </p>

          <h4>1.1. 1on1の目的</h4>
          <p>安心して仕事に向き合えるようにすることが目的。例えば次のねらいがある。</p>
          <ul>
            <li>・感じていることを言葉にして整理する。</li>
            <li>・成長やキャリアについて相談する。</li>
            <li>・上司との信頼関係を深めていく。</li>
            <li>・自分のビジョンと会社の目標をすり合わせていく。</li>
          </ul>

          <h4>1.2. 評価面談とのちがい</h4>
          <p>
            1on1は評価の場ではない。点数や成績を気にせず、本音で話して大丈夫。肩の力を抜いて臨もう。
          </p>

          <h3>2. 1on1の進め方</h3>
          <h4>2.1. 主役はあなた</h4>
          <p>
            1on1の主役はあなた。話すテーマはあなたが決めてよい。上司は「地蔵スタイル」でしっかり聴く。
          </p>

          <h4>2.2. 話す内容</h4>
          <p>話題は自由。特別な準備は不要。</p>
          <ul>
            <li>・最近の成功や困りごと</li>
            <li>・挑戦したいことや将来のキャリア</li>
            <li>・会社やチームで気になっていること</li>
            <li>・プライベートや雑談もOK</li>
          </ul>

          <h4>2.3. 事前準備（任意）</h4>
          <p>
            準備は必須ではない。もし余裕があれば「今日話したいこと」や
            「上司にどうしてほしいか（ただ聴いてほしい／助言がほしい／一緒に考えたい）」を少し考えておくと進めやすい。
            その場で思いついたことを話しても問題ない。
          </p>

          <h4>2.4. 30分の基本フロー（例）</h4>
          <ol>
            <li><strong>はじめ（2–3分）:</strong> あいさつと軽い雑談。</li>
            <li><strong>近況（5分）:</strong> 最近の様子や調子を共有。</li>
            <li><strong>メイン（15分）:</strong> 気になっていることを自由に話す。上司は基本、静かに聴く。</li>
            <li><strong>まとめ（4–5分）:</strong> 話した内容の確認と必要なサポートを相談。</li>
            <li><strong>次回に向けて（2–3分）:</strong> 次までに考えることを軽く確認。</li>
            <li><strong>おわり（1分）:</strong> 感謝を伝えて終了。</li>
          </ol>

          <h3>3. 安心して話すために</h3>
          <h4>3.1. 信頼とプライバシー</h4>
          <p>
            上司は、否定や早口の助言を避け、まず受けとめることを意識している。プライバシーにも配慮するので安心してほしい。
          </p>

          <h4>3.2. メモについて</h4>
          <p>
            上司が理解を深めるためにメモをとることがある。残してほしくない部分は、
            「ここはメモなしでお願いします」と気軽に伝えてよい。遠慮は要らない。
          </p>

          <h3>4. よくある質問（部下向け）</h3>
          <dl>
            <dt>Q. 話すことが思いつかない…</dt>
            <dd>
              A. 無理に用意しなくて大丈夫。「特になし」でもOK。雑談から始めてもよい。話すうちに考えがまとまることは多い。
            </dd>

            <dt>Q. 上司があまり助言してくれない…</dt>
            <dd>
              A. この1on1はまず「聴く」ことを大切にしている。助言がほしいときは
              「◯◯についてアドバイスがほしい」と具体的に伝えてみよう。
            </dd>

            <dt>Q. 沈黙が気まずい…</dt>
            <dd>
              A. 沈黙は考えを深める大事な時間。上司は意図的に待っているので、焦らなくて大丈夫。
            </dd>

            <dt>Q. 会社への不満を言ってもいい？</dt>
            <dd>
              A. 大丈夫。「どんな事実があって、どう感じたか」を具体的に伝えると、より建設的な対話につながる。
            </dd>
          </dl>
        </AccordionItem>
      </div>
    </div>
  );
}

export default LearningResources;
