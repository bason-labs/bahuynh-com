import styles from "./chapter.module.css";

type ChapterHeadProps = {
  number: string;
  kicker: string;
  titleLead: string;
  titleAccent: string;
  lede: string;
  centered?: boolean;
};

export function ChapterHead({ number, kicker, titleLead, titleAccent, lede, centered }: ChapterHeadProps) {
  return (
    <div className={centered ? `${styles.head} ${styles.centered}` : styles.head}>
      <div>
        <div className={`${styles.kicker} mono`}>
          <b>{number}</b>
          <span>{kicker}</span>
        </div>
        <h2>
          {titleLead} <em>{titleAccent}</em>
        </h2>
      </div>
      <p className={styles.lede}>{lede}</p>
    </div>
  );
}
