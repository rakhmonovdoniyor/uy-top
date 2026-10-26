import { useState } from "react";
import { reportReasons } from "../constants";

export function useListingReport({ listing, reportListing, t }) {
  const [reportReason, setReportReason] = useState(reportReasons[0]);
  const [reportStatus, setReportStatus] = useState("");

  async function submitReport() {
    const isReported = await reportListing(listing, reportReason);

    if (isReported) {
      setReportStatus(t("detail.reportedStatus"));
    }
  }

  return {
    reportReason,
    reportStatus,
    setReportReason,
    submitReport,
  };
}
