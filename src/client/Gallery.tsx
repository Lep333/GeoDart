import { useNavigate } from "react-router-dom";
import { useCounter } from './hooks/useCounter';

const Gallery: React.FC = () => {
  const { gallery } = useCounter();
  const navigate = useNavigate();

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4">
      <img src={`${gallery}`} alt="Where is this?" />
      <button className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white opacity-100 focus:outline-none" onClick={() => navigate("/map")}>Lets guess...</button>
    </div>
  );
};

export default Gallery;