import React from "react";
import { MdOutlineDoneOutline } from "react-icons/md";
import { MdOutlineErrorOutline } from "react-icons/md";
import { Toaster } from "react-hot-toast";

export const CustomToast = () => {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                style: {
                    fontSize: "14px",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    boxShadow: "0 8px 24px rgb(15 23 42 / 0.12)",
                    border: "1px solid #e2e8f0",
                },
                success: {
                    position: "top-right",
                    duration: 3000,
                    icon: (
                        <div>
                            <MdOutlineDoneOutline />
                        </div>
                    ),
                    style: {
                        color: "#15803d",
                        background: "#fff",
                    },
                },
                error: {
                    duration: 3000,
                    icon: (
                        <div className="text-white text-2xl">
                            <MdOutlineErrorOutline />
                        </div>
                    ),
                    style: {
                        background: "#b91c1c",
                        color: "#fff",
                        maxWidth: "min(360px, calc(100vw - 32px))",
                        borderRadius: "12px",
                    },
                },
            }}
        />
    );
};
