import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { FiMessageCircle, FiX } from "react-icons/fi";
import MobileNav from "./components/MobileNav";
import {
  RequireActiveUser,
  RequireAdmin,
  RequireAuth,
} from "./components/RouteGuards";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";
import { useAdminActions } from "./hooks/useAdminActions";
import { useAuthSession } from "./hooks/useAuthSession";
import { useChatActions } from "./hooks/useChatActions";
import { useChatSummary } from "./hooks/useChatSummary";
import { useChatToast } from "./hooks/useChatToast";
import { useCompareListings } from "./hooks/useCompareListings";
import { useDemoReset } from "./hooks/useDemoReset";
import { useEstateState } from "./hooks/useEstateState";
import { useFavoriteActions } from "./hooks/useFavoriteActions";
import { useListingCatalog } from "./hooks/useListingCatalog";
import { useListingActions } from "./hooks/useListingActions";
import { useListingFilters } from "./hooks/useListingFilters";
import { useListingStats } from "./hooks/useListingStats";
import { useModerationActions } from "./hooks/useModerationActions";
import { useNotifications } from "./hooks/useNotifications";
import { useRealEstateAppState } from "./hooks/useRealEstateAppState";
import { useSavedSearchActions } from "./hooks/useSavedSearchActions";
import { I18nProvider } from "./i18n";
import AddListingPage from "./pages/AddListingPage";
import AdminPage from "./pages/AdminPage";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import ComparePage from "./pages/ComparePage";
import EditListingPage from "./pages/EditListingPage";
import HomePage from "./pages/HomePage";
import ListingDetailPage from "./pages/ListingDetailPage";
import ListingsPage from "./pages/ListingsPage";
import AgentProfilePage from "./pages/AgentProfilePage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import "./realEstate.css";

function RealEstateApp() {
  const {
    adminActions,
    applyEstateState,
    baseListings,
    createdListings,
    currentUser,
    dataError,
    dataSource,
    deletedListingIds,
    favoriteIds,
    isInitialLoading,
    listingOverrides,
    listingReports,
    messages,
    savedSearches,
    setAdminActions,
    setCreatedListings,
    setCurrentUser,
    setDataError,
    setDataSource,
    setDeletedListingIds,
    setFavoriteIds,
    setListingOverrides,
    setListingReports,
    setMessages,
    setSavedSearches,
    setStoredListingStatsById,
    setStoredNotifications,
    setUsers,
    storedListingStatsById,
    storedNotifications,
    users,
  } = useEstateState();
  const {
    clearCompareListings,
    compareIds,
    removeCompareListing,
    toggleCompareListing,
  } = useCompareListings();
  const {
    applyFilters,
    filters,
    resetFilters,
    updateFilter,
  } = useListingFilters();

  const {
    allListings,
    cities,
    districts,
    searchSuggestions,
    visibleListings,
  } = useListingCatalog({
    baseListings,
    createdListings,
    currentUser,
    deletedListingIds,
    listingOverrides,
  });
  const { chatConversations, unreadChatCount } = useChatSummary({
    currentUser,
    messages,
  });
  const {
    applyListingStats,
    incrementStoredListingStat,
    listingStatsById,
    trackListingLead,
    trackListingView,
  } = useListingStats({
    allListings,
    favoriteIds,
    messages,
    setStoredListingStatsById,
    storedListingStatsById,
  });
  const [chatToast, setChatToast] = useChatToast({
    chatConversations,
    currentUser,
    unreadChatCount,
  });
  const {
    handleActionError,
    loginUser,
    logoutUser,
    startPhoneVerification,
    updateProfile,
    verifyPhoneCode,
  } = useAuthSession({
    applyEstateState,
    currentUser,
    setChatToast,
    setCurrentUser,
    setDataError,
    setDataSource,
    setFavoriteIds,
    setMessages,
    setSavedSearches,
    setStoredNotifications,
    setUsers,
    users,
  });
  const { toggleFavorite } = useFavoriteActions({
    applyListingStats,
    currentUser,
    favoriteIds,
    handleActionError,
    incrementStoredListingStat,
    setDataError,
    setFavoriteIds,
  });
  const {
    markAllNotificationsRead,
    markNotificationRead,
    notifications,
    unreadNotificationCount,
  } = useNotifications({
    allListings,
    chatConversations,
    currentUser,
    handleActionError,
    setDataError,
    setStoredNotifications,
    storedNotifications,
  });
  const { addAdminAction, cleanupUploads } = useAdminActions({
    currentUser,
    handleActionError,
    setAdminActions,
    setDataError,
  });
  const {
    createListing,
    deleteListing,
    toggleListingFeatured,
    updateListing,
    updateListingAdminNote,
    updateListingModerationStatus,
  } = useListingActions({
    addAdminAction,
    allListings,
    createdListings,
    currentUser,
    deletedListingIds,
    favoriteIds,
    handleActionError,
    listingOverrides,
    removeCompareListing,
    setCreatedListings,
    setDataError,
    setDeletedListingIds,
    setFavoriteIds,
    setListingOverrides,
    setStoredListingStatsById,
    storedListingStatsById,
  });
  const { deleteSavedSearch, saveSearch } = useSavedSearchActions({
    currentUser,
    handleActionError,
    savedSearches,
    setDataError,
    setSavedSearches,
  });
  const {
    reportListing,
    resolveListingReport,
    updateUserStatus,
  } = useModerationActions({
    addAdminAction,
    currentUser,
    handleActionError,
    listingReports,
    setCurrentUser,
    setDataError,
    setListingReports,
    setUsers,
    users,
  });
  const {
    markAllInboxMessagesRead,
    markConversationRead,
    markMessageRead,
    replyToMessage,
    sendChatMessage,
    sendListingMessage,
  } = useChatActions({
    currentUser,
    handleActionError,
    messages,
    setDataError,
    setMessages,
  });

  const { resetDemoState } = useDemoReset({
    applyEstateState,
    clearCompareListings,
    resetFilters,
  });

  const appState = useRealEstateAppState({
    admin: {
      adminActions,
      cleanupUploads,
      listingReports,
      reportListing,
      resolveListingReport,
      updateUserStatus,
    },
    catalog: {
      allListings,
      cities,
      districts,
      searchSuggestions,
      visibleListings,
    },
    chat: {
      chatConversations,
      markAllInboxMessagesRead,
      markConversationRead,
      markMessageRead,
      messages,
      replyToMessage,
      sendChatMessage,
      sendListingMessage,
      unreadChatCount,
    },
    compare: {
      clearCompareListings,
      compareIds,
      toggleCompareListing,
    },
    data: {
      dataError,
      dataSource,
      isInitialLoading,
    },
    filters: {
      applyFilters,
      filters,
      resetFilters,
      updateFilter,
    },
    listings: {
      createdListings,
      deleteListing,
      favoriteIds,
      toggleFavorite,
      toggleListingFeatured,
      updateListingAdminNote,
      updateListingModerationStatus,
    },
    notifications: {
      markAllNotificationsRead,
      markNotificationRead,
      notifications,
    },
    savedSearch: {
      deleteSavedSearch,
      savedSearches,
      saveSearch,
    },
    stats: {
      listingStatsById,
      trackListingLead,
      trackListingView,
    },
    user: {
      currentUser,
      startPhoneVerification,
      updateProfile,
      users,
      verifyPhoneCode,
    },
  });

  return (
    <I18nProvider>
      <BrowserRouter>
        <div className="estate-app">
        <SiteHeader
          currentUser={currentUser}
          notificationCount={unreadNotificationCount}
          onLogout={logoutUser}
          unreadChatCount={unreadChatCount}
        />
        <main className="estate-main">
          {isInitialLoading && (
            <div className="skeleton-grid" aria-label="Ma'lumot yuklanmoqda">
              <span />
              <span />
              <span />
            </div>
          )}
          {dataError && (
            <div className="data-alert" role="alert">
              <strong>Amal bajarilmadi</strong>
              <span>{dataError}</span>
            </div>
          )}
          {!isInitialLoading && (
          <Routes>
            <Route path="/" element={<HomePage {...appState} />} />
            <Route path="/listings" element={<ListingsPage {...appState} />} />
            <Route path="/compare" element={<ComparePage {...appState} />} />
            <Route
              path="/listings/:listingId"
              element={<ListingDetailPage {...appState} />}
            />
            <Route path="/agents/:agentKey" element={<AgentProfilePage {...appState} />} />
            <Route
              path="/add-listing"
              element={
                <RequireActiveUser currentUser={currentUser}>
                  <AddListingPage
                    currentUser={currentUser}
                    onCreateListing={createListing}
                  />
                </RequireActiveUser>
              }
            />
            <Route
              path="/edit-listing/:listingId"
              element={
                <RequireActiveUser currentUser={currentUser}>
                  <EditListingPage
                    allListings={allListings}
                    currentUser={currentUser}
                    onDeleteListing={deleteListing}
                    onUpdateListing={updateListing}
                  />
                </RequireActiveUser>
              }
            />
            <Route
              path="/login"
              element={<AuthPage currentUser={currentUser} onLogin={loginUser} />}
            />
            <Route
              path="/chats"
              element={
                <RequireAuth currentUser={currentUser}>
                  <ChatPage {...appState} />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth currentUser={currentUser}>
                  <ProfilePage
                    allListings={allListings}
                    chatConversations={chatConversations}
                    currentUser={currentUser}
                    dataSource={dataSource}
                    favoriteIds={favoriteIds}
                    listingStatsById={listingStatsById}
                    notifications={notifications}
                    onDeleteListing={deleteListing}
                    onLogout={logoutUser}
                    onResetDemo={resetDemoState}
                    onStartPhoneVerification={startPhoneVerification}
                    onUpdateProfile={updateProfile}
                    onVerifyPhoneCode={verifyPhoneCode}
                  />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAdmin currentUser={currentUser}>
                  <AdminPage {...appState} />
                </RequireAdmin>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          )}
        </main>
        <SiteFooter />
        <MobileNav currentUser={currentUser} unreadChatCount={unreadChatCount} />
        {chatToast && (
          <div className="chat-toast" role="status">
            <span className="agent-avatar">
              <FiMessageCircle aria-hidden="true" />
            </span>
            <div>
              <strong>{chatToast.sender}</strong>
              <p>{chatToast.text || "Yangi xabar"}</p>
            </div>
            <Link
              onClick={() => setChatToast(null)}
              to={`/chats?chat=${encodeURIComponent(chatToast.key)}`}
            >
              Ochish
            </Link>
            <button
              aria-label="Bildirishnomani yopish"
              onClick={() => setChatToast(null)}
              type="button"
            >
              <FiX aria-hidden="true" />
            </button>
          </div>
        )}
        </div>
      </BrowserRouter>
    </I18nProvider>
  );
}

export default RealEstateApp;
