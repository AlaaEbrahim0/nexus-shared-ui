import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../api/client";
import { getMyProfile, updateMyProfile } from "../api/profile.api";
import { useAuth } from "../auth/authProvider";

const UserProfileContext = createContext(null);

/**
 * Loads the signed-in account's rich profile once and shares it with the
 * layout. The same response powers the doctor sidebar and the profile views
 * because every account type now has a rich profile.
 */
export const UserProfileProvider = ({ children }) => {
    const { token } = useAuth();
    const [userProfileData, setUserProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(Boolean(token));
    const [error, setError] = useState(null);
    const tokenRef = useRef(token);

    tokenRef.current = token;

    const loadProfile = useCallback(
        async ({ showLoading = true, notify = true } = {}) => {
            if (!token) {
                setUserProfileData(null);
                setError(null);
                setIsLoading(false);
                return null;
            }

            if (showLoading) setIsLoading(true);

            try {
                const profile = await getMyProfile();
                if (tokenRef.current !== token) return null;
                setUserProfileData(profile);
                setError(null);
                return profile;
            } catch (requestError) {
                if (tokenRef.current !== token) return null;
                setError(requestError);
                if (notify && requestError.response?.status !== 401) {
                    toast.error(
                        getApiErrorMessage(
                            requestError,
                            "Failed to load your profile"
                        )
                    );
                }
                return null;
            } finally {
                if (tokenRef.current === token && showLoading) {
                    setIsLoading(false);
                }
            }
        },
        [token]
    );

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const refreshProfile = useCallback(
        () => loadProfile({ showLoading: false, notify: false }),
        [loadProfile]
    );

    const updateUserProfile = useCallback(async (profileUpdates) => {
        const updatedProfile = await updateMyProfile(profileUpdates);
        setUserProfileData(updatedProfile);
        setError(null);
        return updatedProfile;
    }, []);

    const reset = useCallback(() => {
        setUserProfileData(null);
        setError(null);
    }, []);

    const value = useMemo(
        () => ({
            userProfileData,
            isLoading,
            error,
            refreshProfile,
            updateUserProfile,
            reset,
        }),
        [userProfileData, isLoading, error, refreshProfile, updateUserProfile, reset]
    );

    return (
        <UserProfileContext.Provider value={value}>
            {children}
        </UserProfileContext.Provider>
    );
};

export const useUserProfile = () => {
    const context = useContext(UserProfileContext);
    if (!context) {
        throw new Error("useUserProfile must be used inside UserProfileProvider");
    }
    return context;
};
