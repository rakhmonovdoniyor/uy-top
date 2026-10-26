import { Link } from "react-router-dom";
import { FiHome } from "react-icons/fi";

function NotFoundPage() {
  return (
    <section className="empty-state route-empty">
      <FiHome aria-hidden="true" />
      <h3>Sahifa topilmadi</h3>
      <p>Manzil noto'g'ri yoki bu sahifa hali qo'shilmagan.</p>
      <Link className="phone-button" to="/">
        Bosh sahifaga qaytish
      </Link>
    </section>
  );
}

export default NotFoundPage;
