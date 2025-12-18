import { createContext, useContext, useState } from "react";

type AppState = {
  latitude: number | null;
  setLatitude: (lat: number | null) => void;
  longitude: number | null;
  setLongitude: (long: number | null) => void;
};

export const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  return (
    <AppContext.Provider value={{ latitude, setLatitude, longitude, setLongitude }}>
      {children}
    </AppContext.Provider>
  );
}
