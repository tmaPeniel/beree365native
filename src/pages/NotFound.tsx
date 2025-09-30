
import React from "react";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <h1 className="text-7xl font-bold text-beree-500 mb-4">404</h1>
        <p className="text-xl text-foreground mb-6">
          Cette page n'existe pas
        </p>
        <p className="text-muted-foreground mb-8">
          La page que vous recherchez n'a pas été trouvée ou a été déplacée.
        </p>
        <Link to="/">
          <Button className="rounded-full bg-beree-500 hover:bg-beree-600 px-8">
            Retourner à l'accueil
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
