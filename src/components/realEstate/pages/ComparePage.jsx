import { Link } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiHome, FiX } from "react-icons/fi";
import EmptyState from "../components/EmptyState";
import PageIntro from "../components/PageIntro";
import { useI18n } from "../i18n";
import { formatArea } from "../utils/listingUtils";

function ComparePage({
  allListings,
  clearCompareListings,
  compareIds,
  toggleCompareListing,
}) {
  const { t, tOption } = useI18n();
  const compareListings = compareIds
    .map((id) => allListings.find((listing) => Number(listing.id) === Number(id)))
    .filter(Boolean);

  const rows = [
    {
      label: t("compare.price"),
      render: (listing) => listing.priceLabel,
    },
    {
      label: t("compare.location"),
      render: (listing) => `${listing.city}, ${listing.district}`,
    },
    {
      label: t("compare.dealType"),
      render: (listing) =>
        listing.dealType === "rent" ? t("common.forRent") : t("common.forSale"),
    },
    {
      label: t("compare.propertyType"),
      render: (listing) => tOption(listing.propertyType),
    },
    {
      label: t("compare.rooms"),
      render: (listing) => t("compare.roomsValue", { count: listing.rooms }),
    },
    {
      label: t("compare.area"),
      render: (listing) => formatArea(listing.area),
    },
    {
      label: t("compare.floor"),
      render: (listing) => listing.floor,
    },
    {
      label: t("compare.renovation"),
      render: (listing) => tOption(listing.renovationCondition || "-"),
    },
    {
      label: t("compare.document"),
      render: (listing) => tOption(listing.documentType || "-"),
    },
    {
      label: t("compare.furnished"),
      render: (listing) => (listing.furnished ? t("common.yes") : t("common.no")),
    },
    {
      label: t("compare.negotiable"),
      render: (listing) => (listing.negotiable ? t("common.yes") : t("common.no")),
    },
    {
      label: t("compare.agent"),
      render: (listing) => listing.agent,
    },
    {
      label: t("compare.status"),
      render: (listing) =>
        listing.verified ? t("common.verified") : t("compare.notVerified"),
    },
  ];

  return (
    <section className="page-stack">
      <Link className="back-link" to="/listings">
        <FiArrowLeft aria-hidden="true" />
        {t("compare.backListings")}
      </Link>

      <PageIntro
        kicker={t("compare.kicker")}
        title={t("compare.title")}
        text={t("compare.text")}
      />

      {compareListings.length === 0 ? (
        <EmptyState
          icon={FiHome}
          title={t("compare.emptyTitle")}
          text={t("compare.emptyText")}
        />
      ) : (
        <div className="compare-page-panel">
          <div className="compare-page-head">
            <span className="result-count">
              {t("compare.selectedCount", { count: compareListings.length })}
            </span>
            <button className="ghost-button" onClick={clearCompareListings} type="button">
              <FiX aria-hidden="true" />
              {t("compare.clear")}
            </button>
          </div>

          <div className="compare-table-wrap">
            <table className="compare-table" aria-label={t("compare.tableLabel")}>
              <thead>
                <tr>
                  <th scope="col">{t("compare.field")}</th>
                  {compareListings.map((listing) => (
                    <th key={listing.id} scope="col">
                      <div className="compare-listing-head">
                        <img alt={listing.title} src={listing.image} />
                        <Link to={`/listings/${listing.id}`}>{listing.title}</Link>
                        <button
                          aria-label={t("compare.removeListing", {
                            title: listing.title,
                          })}
                          onClick={() => toggleCompareListing(listing.id)}
                          type="button"
                        >
                          <FiX aria-hidden="true" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {compareListings.map((listing) => (
                      <td key={`${row.label}-${listing.id}`}>
                        {row.render(listing)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {compareListings.length < 2 && (
            <p className="compare-hint">
              <FiCheckCircle aria-hidden="true" />
              {t("compare.needMore")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default ComparePage;
