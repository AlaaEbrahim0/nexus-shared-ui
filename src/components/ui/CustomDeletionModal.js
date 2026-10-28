export const CustomDeletionModal = ({ id, handleConfirm, loading }) => {
    return (
        <dialog id={id} className="modal">
            <div className="modal-box bg-white rounded-lg shadow-lg p-6 w-80">
                <h3 className="font-bold text-xl mb-2">Confirm Deletion</h3>
                <p className="py-2">Are you sure you want to delete?</p>
                <div className="modal-action mt-4 flex justify-around">
                    <button
                        className="btn btn-sm btn-secondary mr-2"
                        onClick={() => document.getElementById(id).close()}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-sm btn-error text-white"
                        onClick={() => {
                            handleConfirm();
                            document.getElementById(id).close();
                        }}
                        disabled={loading}
                    >
                        {loading && (
                            <span className="loading loading-spinner text-error"></span>
                        )}
                        Confirm Delete
                    </button>
                </div>
            </div>
        </dialog>
    );
};

export const CustomConfirmationModal = ({ id, handleConfirm, loading }) => {
    return (
        <dialog id={id} className="modal">
            <div className="modal-box bg-white rounded-lg shadow-lg p-6 w-80">
                <h3 className="font-bold text-xl mb-2">Confirm Deletion</h3>
                <p className="py-2">Are you sure you want to delete?</p>
                <div className="modal-action mt-4 flex justify-around">
                    <button
                        className="btn btn-sm btn-secondary mr-2"
                        onClick={() => document.getElementById(id).close()}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-sm btn-error"
                        onClick={() => {
                            handleConfirm();
                            document.getElementById(id).close();
                        }}
                        disabled={loading}
                    >
                        {loading && (
                            <span className="loading loading-spinner text-error"></span>
                        )}
                        Confirm Delete
                    </button>
                </div>
            </div>
        </dialog>
    );
};
