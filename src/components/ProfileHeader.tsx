
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileHeaderProps {
  name: string;
  email: string;
  avatarUrl?: string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ name, email, avatarUrl }) => {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
  
  return (
    <div className="flex items-center space-x-4">
      <Avatar className="h-16 w-16">
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback className="bg-beree-100 text-beree-800 text-lg font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div>
        <h2 className="text-2xl font-semibold text-foreground">{name}</h2>
        <p className="text-muted-foreground">{email}</p>
      </div>
    </div>
  );
};

export default ProfileHeader;
