import { realEstateDataGateway } from "../../../services/realEstateDataGateway";
import { realEstateRepository } from "../../../services/realEstateRepository";

export function useAuthSession({
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
}) {
  function clearSignedInState() {
    setCurrentUser(null);

    if (realEstateDataGateway.isApiMode()) {
      setFavoriteIds([]);
      setMessages([]);
      setStoredNotifications([]);
      setSavedSearches([]);
      setUsers([]);
      setChatToast(null);
    }
  }

  function handleActionError(error) {
    if (realEstateDataGateway.isApiMode() && error.status === 401) {
      realEstateDataGateway.logout();
      clearSignedInState();
    }

    setDataError(error.message);
  }

  async function loginUser(formState, mode) {
    const authResult = await realEstateDataGateway.authenticate(mode, formState);
    const nextState = realEstateRepository.upsertUser(users, authResult.user);

    setUsers(nextState.users);
    setCurrentUser(nextState.user);
    setDataSource(authResult.source);

    if (authResult.source === "api") {
      const result = await realEstateDataGateway.loadInitialState();
      applyEstateState({
        ...result.state,
        currentUser: result.state.currentUser || nextState.user,
      });
      setDataSource(result.source);
      setDataError(result.error ? result.error.message : "");
    }

    return nextState.user;
  }

  function logoutUser() {
    realEstateDataGateway.logout();
    clearSignedInState();
    setDataError("");
  }

  async function updateProfile(updatedUser) {
    let savedUser = {
      ...currentUser,
      ...updatedUser,
    };

    try {
      savedUser = await realEstateDataGateway.updateProfile(savedUser);
    } catch (error) {
      handleActionError(error);
      return null;
    }

    const nextState = realEstateRepository.upsertUser(users, {
      ...savedUser,
    });

    setUsers(nextState.users);
    setCurrentUser(nextState.user);
    setDataError("");
    return nextState.user;
  }

  async function startPhoneVerification() {
    try {
      const result = await realEstateDataGateway.startPhoneVerification();
      setDataError("");
      return result;
    } catch (error) {
      handleActionError(error);
      return null;
    }
  }

  async function verifyPhoneCode(code) {
    try {
      const verifiedUser = await realEstateDataGateway.verifyPhoneCode(code);
      const nextUser =
        verifiedUser && verifiedUser.id
          ? verifiedUser
          : { ...currentUser, phoneVerified: true };
      const nextState = realEstateRepository.upsertUser(users, nextUser);

      setUsers(nextState.users);
      setCurrentUser(nextState.user);
      setDataError("");
      return nextState.user;
    } catch (error) {
      handleActionError(error);
      return null;
    }
  }

  return {
    handleActionError,
    loginUser,
    logoutUser,
    startPhoneVerification,
    updateProfile,
    verifyPhoneCode,
  };
}
