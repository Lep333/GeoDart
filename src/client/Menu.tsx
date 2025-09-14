import { useNavigate } from "react-router-dom";

const Menu: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4">
      <div className="text-xl">Geo Dart</div>
      <button className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white opacity-100 focus:outline-none" onClick={() => navigate("/gallery")}>PLAY</button>
      <button className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white opacity-100 focus:outline-none" onClick={() => navigate("/create_game")}>CREATE GAME</button>
    </div>
  );
};

export default Menu;