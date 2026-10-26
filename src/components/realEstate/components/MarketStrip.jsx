import { Link } from "react-router-dom";
import { FiChevronRight, FiMap } from "react-icons/fi";
import { marketStats } from "../../../data/realEstateData";

function MarketStrip() {
  return (
    <section className="market-strip" aria-label="Bozor statistikasi">
      {marketStats.map((item) => (
        <div className="market-stat" key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
      <Link className="map-link" to="/listings">
        <FiMap aria-hidden="true" />
        Xarita ko'rinishi
        <FiChevronRight aria-hidden="true" />
      </Link>
    </section>
  );
}

export default MarketStrip;
