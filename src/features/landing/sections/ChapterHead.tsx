import styles from "./chapter.module.css";

type ChapterHeadProps = {
  number: string;
  kicker: string;
  titleLead: string;
  titleAccent: string;
  lede: string;
};

export function ChapterHead({ number, kicker, titleLead, titleAccent, lede }: ChapterHeadProps) {
  return (
    <div className={styles.head}>
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
