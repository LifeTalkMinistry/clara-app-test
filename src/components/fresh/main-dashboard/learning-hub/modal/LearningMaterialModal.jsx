export default function LearningMaterialModal({ isOpen, material, onClose }) {
  if (!isOpen || !material) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
      <div className="bg-black rounded-xl p-6 w-[90%] max-w-md">
        <h2 className="text-lg mb-4">{material.title}</h2>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
