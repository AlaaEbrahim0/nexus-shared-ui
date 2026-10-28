export const PostSkeleton = () => {
    return (
        <div className="flex flex-col mb-8 glass shadow-md rounded-lg w-full animate-pulse p-4">
            <div className="info flex flex-row justify-between w-full">
                <div className="flex flex-row">
                    <div className="w-24 h-24 bg-gray-300 rounded-2xl shadow-md"></div>
                    <div className="ml-4 flex flex-col justify-center">
                        <div className="h-6 bg-gray-300 rounded w-24 mb-2"></div>
                        <div className="h-4 bg-gray-300 rounded w-20"></div>
                    </div>
                </div>
                <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            </div>
            <div className="mt-4">
                <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-5/6 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-4/5 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3"></div>
            </div>
            <div className="mt-4">
                <div className="w-full h-48 bg-gray-300 rounded-lg"></div>
            </div>
        </div>
    );
};
