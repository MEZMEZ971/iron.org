import { useNavigate } from "react-router-dom";
import { ProfileMenuContent } from "../components/ProfileMenu";

export default function ProfileMenuPage() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[85] bg-df-page transition-all duration-300 ease-in-out md:relative md:inset-auto md:z-auto md:min-h-[min(100%,calc(100vh-3rem))] md:overflow-hidden md:rounded-2xl md:border md:border-df">
      <ProfileMenuContent showBack onBack={() => navigate(-1)} />
    </div>
  );
}
