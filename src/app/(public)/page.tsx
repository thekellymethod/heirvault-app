import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <h1>HeirVault</h1>
      <p>
        Secure registry for life insurance policy records. Intake is designed to be simple; attorney access is controlled.
      </p>
      <div className={styles.links}>
        <a href="/intake">Submit a Policy (Intake)</a>
        <a href="/login">Attorney Login</a>
      </div>
    </main>
  );
}
