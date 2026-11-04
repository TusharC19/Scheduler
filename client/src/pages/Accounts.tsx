import { useEffect, useState } from "react";
import { PLATFORMS } from "../assets/assets";
import { PlusIcon } from "lucide-react";
import AccountList from "../components/AccountList";
import PlatformPickerModal from "../components/PlatformPickerModal";
import toast from "react-hot-toast";
import api from "../api/axios";

const Accounts = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [showPlatformPicker, setShowPlatformPicker] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchAccounts = async (isSync = false, platform?: string | null, successMsg?: string) => {
        try {
            if (isSync) {
                const label = platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : "Social Media";
                toast.loading(`Syncing ${label} account...`, { id: "sync" });
                await api.get("/api/oauth/sync");
                toast.success(successMsg || "Accounts synced!", { id: "sync" });
            }

            const { data } = await api.get("/api/accounts");
            setAccounts(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error("Fetch accounts error:", error);
            toast.error(error?.response?.data?.message || error?.message || "Failed to load accounts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const connectedPlatform = params.get("connected");
        const connectedUsername = params.get("username");
        const syncNeeded = params.get("sync") === "true";
        const errorMsg = params.get("error");

        if (connectedPlatform || errorMsg || syncNeeded) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (connectedPlatform) {
            const label = connectedPlatform.charAt(0).toUpperCase() + connectedPlatform.slice(1);
            const handle = connectedUsername ? ` (@${connectedUsername})` : "";
            fetchAccounts(true, connectedPlatform, `${label}${handle} connected!`);
        } else if (errorMsg) {
            toast.error(`Connection failed: ${decodeURIComponent(errorMsg)}`);
            fetchAccounts();
        } else if (syncNeeded) {
            fetchAccounts(true, null, "Accounts synced!");
        } else {
            fetchAccounts();
        }
    }, []);

    const handleConnect = async (platformId: string) => {
        setConnecting(platformId);
        try {
            const { data } = await api.get(`/api/oauth/${platformId}/url`);
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No authorization URL returned");
            }
        } catch (error: any) {
            console.error("Connect error:", error);
            toast.error(error?.response?.data?.message || error?.message || `Failed to connect ${platformId}`);
            setConnecting(null);
        }
    };

    const handleDisconnect = async (accountId: string) => {
        try {
            await api.delete(`/api/accounts/${accountId}`);
            toast.success("Account disconnected");
            await fetchAccounts();
        } catch (error: any) {
            console.error("Disconnect error:", error);
            toast.error(error?.response?.data?.message || error?.message || "Failed to disconnect account");
        }
    };

    const connectedIds = accounts.map((a) => a.platform);

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm">
                <div>
                    <h2 className="text-xl text-slate-900 font-medium">Connected Accounts</h2>
                    <p className="text-slate-500 text-sm mt-0.5">
                        {loading ? "Loading accounts..." : `${accounts.length} of ${PLATFORMS.length} platforms connected`}
                    </p>
                </div>
                <button
                    onClick={() => setShowPlatformPicker(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition-all w-full sm:w-auto justify-center cursor-pointer"
                >
                    <PlusIcon className="size-4" /> Connect Account
                </button>
            </div>

            {/* Platform picker modal */}
            {showPlatformPicker && (
                <PlatformPickerModal
                    connectedIds={connectedIds}
                    connecting={connecting}
                    onClose={() => setShowPlatformPicker(false)}
                    onConnect={handleConnect}
                />
            )}

            {/* Connected accounts list */}
            {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
                    Loading your connected accounts...
                </div>
            ) : (
                <AccountList accounts={accounts} onDisconnect={handleDisconnect} />
            )}
        </div>
    );
};

export default Accounts;
