import { useParams } from "react-router-dom";
import AddListingPage from "./AddListingPage";
import NotFoundPage from "./NotFoundPage";
import { canManageListing } from "../utils/listingUtils";

function EditListingPage({
  allListings,
  currentUser,
  onDeleteListing,
  onUpdateListing,
}) {
  const { listingId } = useParams();
  const listing = allListings.find((item) => item.id === Number(listingId));

  if (!canManageListing(listing, currentUser)) {
    return <NotFoundPage />;
  }

  return (
    <AddListingPage
      currentUser={currentUser}
      initialListing={listing}
      mode="edit"
      onDeleteListing={onDeleteListing}
      onUpdateListing={onUpdateListing}
    />
  );
}

export default EditListingPage;
