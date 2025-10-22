import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {doc,getDoc} from "firebase/firestore";
import {auth,db} from "../../firebase";
const AuthContext = createContext<{
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  role: string | null;
  setRole: React.Dispatch<React.SetStateAction<string | null>>;
  blockNavigation: boolean;
  setBlockNavigation: React.Dispatch<React.SetStateAction<boolean>>;
  setSessionPending: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  user: null,
  setUser: () => {},
  role: null,
  setRole: () => {},
  blockNavigation: false,
  setBlockNavigation: () => {},
  setSessionPending: () => {},
});



export function AuthProvider({ children }: { children: React.ReactNode }) {
  
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null);
    const [blockNavigation, setBlockNavigation] = useState(false);
    const [sessionPending, setSessionPending] = useState(false);

      useEffect(() => {
        // Escucha cambios de sesión
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            setUser(user);
            try {
              // Trae el rol del usuario desde Firestore
              const ref = doc(db, "users", user.uid);
              const snap = await getDoc(ref);

              if (snap.exists()) {
                const data = snap.data();
                setRole(data.role || "user");
                console.log("Rol cargado desde Firestore:", data.role);
              } else {
                console.log("No existe el documento del usuario en Firestore");
                setRole("user");
              }
            } catch (err) {
              console.log("Error al obtener el rol del usuario:", err);
              setRole("user");
            }
          } else {
            // No hay usuario autenticado
            setUser(null);
            setRole(null);
          }
        });

        return unsubscribe;
      }, []);
      
  return (
    <AuthContext.Provider value={{ 
        user, setUser, role, setRole, blockNavigation, setBlockNavigation, setSessionPending }}>
      {children}
    </AuthContext.Provider>
  );

}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
