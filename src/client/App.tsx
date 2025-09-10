import { useCounter } from './hooks/useCounter';

export const App = () => {
  const { gallery } = useCounter();
  console.log('Img URL: ', gallery)
  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4">
      <img src={`${gallery}`} alt="Where is this?" />
    </div>
  );
};
