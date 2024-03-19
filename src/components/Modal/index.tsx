import styles from "./styles.module.css";

const Modal = () => {
  return (
    <div>
      <h1>Pure CSS modal box</h1>
      <div>
        <p>You can place trigger button wherever you want.</p>
        <p>
          <label className={styles.btn} htmlFor="modal-1">
            Show me modal with a cat
          </label>
        </p>
      </div>

      <input className={styles.modalState} id="modal-1" type="checkbox" />
      <div className={styles.modal}>
        <label className={styles.modalBg} htmlFor="modal-1"></label>
        <div className={styles.modalInner}>
          <label className={styles.modalClose} htmlFor="modal-1"></label>
          <h2>Caaaats FTW!</h2>
          <p>
            <img src="https://i.imgur.com/HnrkBwB.gif" alt="" />
            Aliquam in sagittis nulla. Curabitur euismod diam eget risus
            venenatis, sed dictum lectus bibendum. Nunc nunc nisi, hendrerit
            eget nisi id, rhoncus rutrum velit. Nunc vel mauris dolor. Class
            aptent taciti sociosqu ad litora torquent per conubia nostra, per
            inceptos himenaeos. Aliquam fringilla quis nisi eget imperdiet.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Modal;
