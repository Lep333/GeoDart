import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import EarthLoader from "./LoadingScreen";

const Menu: React.FC = () => {
  const navigate = useNavigate();
  const [hasPlayed, setHasPlayed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean | null>(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function checkIfPlayed() {
      const resp = await fetch('/api/already_played');
      if (resp.ok) {
        const { already_played } = await resp.json();
        if (already_played) {
          setHasPlayed(true);
        } else {
          setHasPlayed(false);
        }
      }
      setLoading(false);
    }

    checkIfPlayed();
  }, []);

  if (loading) {
    return (<EarthLoader />);
  }

  if (hasPlayed) {
    navigate("/leaderboard");
  } else {
    navigate("/gallery");
  }

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4">
    </div>
  );
};

export default Menu;