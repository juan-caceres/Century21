// app/context/authContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../firebase";

type AuthContextType = {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  role: string | null;
  setRole: React.Dispatch<React.SetStateAction<string | null>>;
  blockNavigation: boolean;
  setBlockNavigation: React.Dispatch<React.SetStateAction<boolean>>;
  sessionPending: boolean;
  setSessionPending: React.Dispatch<React.SetStateAction<boolean>>;
  loadingAuth: boolean;
  showDeletedModal: boolean;
  setShowDeletedModal: React.Dispatch<React.SetStateAction<boolean>>;
  showDeactivatedModal: boolean;
  setShowDeactivatedModal: React.Dispatch<React.SetStateAction<boolean>>;
  showPendingModal: boolean;
  setShowPendingModal: React.Dispatch<React.SetStateAction<boolean>>;
  showRejectedModal: boolean;
  setShowRejectedModal: React.Dispatch<React.SetStateAction<boolean>>;
  showSessionModal: boolean;
  setShowSessionModal: React.Dispatch<React.SetStateAction<boolean>>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  role: null,
  setRole: () => {},
  blockNavigation: false,
  setBlockNavigation: () => {},
  sessionPending: false,
  setSessionPending: () => {},
  loadingAuth: true,
  showDeletedModal: false,
  setShowDeletedModal: () => {},
  showDeactivatedModal: false,
  setShowDeactivatedModal: () => {},
  showPendingModal: false,
  setShowPendingModal: () => {},
  showRejectedModal: false,
  setShowRejectedModal: () => {},
  showSessionModal: false,
  setShowSessionModal: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [blockNavigation, setBlockNavigation] = useState(false);
  const [sessionPending, setSessionPending] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [showDeactivatedModal, setShowDeactivatedModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, async (usuario) => {
      console.log("Auth state cambió:", usuario ? "Usuario logueado" : "Sin usuario");

      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      setUser(usuario);

      if (usuario) {
        try {
          const userDocRef = doc(db, "users", usuario.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userRole = userData.role?.toLowerCase()?.trim() ?? "user";
            const isEliminado = userData.eliminado ?? false;

            if (isEliminado) {
              console.log("❌ Usuario desactivado - Bloqueando acceso...");
              setRole(null);
              setBlockNavigation(true);
              setShowDeactivatedModal(true);

              setTimeout(async () => {
                try {
                  await signOut(auth);
                } catch (err) {
                  console.error("❌ Error cerrando sesión:", err);
                }
              }, 100);

              setLoadingAuth(false);
              return;
            }

            const estadoUsuario = userData.estado ?? "aprobado";

            if (estadoUsuario === "pendiente" || estadoUsuario === "rechazado") {
              console.log(`❌ Usuario con estado "${estadoUsuario}" - Bloqueando acceso...`);
              setRole(null);
              setBlockNavigation(true);

              if (estadoUsuario === "pendiente") {
                setShowPendingModal(true);
              } else {
                setShowRejectedModal(true);
              }

              // No lo desconectamos: en vez de eso, escuchamos su documento en
              // tiempo real. Así, si un admin lo aprueba mientras sigue en esta
              // pantalla, se destraba automáticamente sin necesidad de F5.
              unsubscribeFirestore = onSnapshot(
                userDocRef,
                async (docSnapshot) => {
                  if (!docSnapshot.exists()) {
                    console.log("❌ USUARIO ELIMINADO COMPLETAMENTE - Cerrando sesión...");
                    setShowPendingModal(false);
                    setShowRejectedModal(false);
                    setShowDeletedModal(true);
                    try {
                      await signOut(auth);
                    } catch (err) {
                      console.error("❌ Error cerrando sesión:", err);
                    }
                    return;
                  }

                  const updatedData = docSnapshot.data();
                  const isNowEliminado = updatedData.eliminado ?? false;
                  const estadoActual = updatedData.estado ?? "aprobado";

                  if (isNowEliminado) {
                    setBlockNavigation(true);
                    setShowPendingModal(false);
                    setShowRejectedModal(false);
                    setShowDeactivatedModal(true);
                    try {
                      await signOut(auth);
                    } catch (err) {
                      console.error("❌ Error cerrando sesión:", err);
                    }
                    return;
                  }

                  if (estadoActual === "pendiente") {
                    setShowPendingModal(true);
                    setShowRejectedModal(false);
                    return;
                  }

                  if (estadoActual === "rechazado") {
                    setShowRejectedModal(true);
                    setShowPendingModal(false);
                    return;
                  }

                  // estadoActual === "aprobado": lo aprobaron en tiempo real
                  console.log("✅ Cuenta aprobada en tiempo real - Desbloqueando acceso...");
                  const nuevoRol = updatedData.role?.toLowerCase()?.trim() ?? "user";
                  setShowPendingModal(false);
                  setShowRejectedModal(false);
                  setRole(nuevoRol);
                  setBlockNavigation(false);

                  if (sessionPending) {
                    setShowSessionModal(true);
                  }
                },
                (error) => {
                  console.error("Error en listener de Firestore (pendiente/rechazado):", error);
                }
              );

              setLoadingAuth(false);
              return;
            }

            setRole(userRole);
            setBlockNavigation(false);

            if (sessionPending) {
              setShowSessionModal(true);
            }

            unsubscribeFirestore = onSnapshot(
              userDocRef,
              async (docSnapshot) => {
                if (!docSnapshot.exists()) {
                  console.log("❌ USUARIO ELIMINADO COMPLETAMENTE - Cerrando sesión...");
                  setShowDeletedModal(true);
                } else {
                  const updatedData = docSnapshot.data();
                  const isNowEliminado = updatedData.eliminado ?? false;
                  const estadoActual = updatedData.estado ?? "aprobado";

                  if (isNowEliminado) {
                    setBlockNavigation(true);
                    setShowDeactivatedModal(true);
                    try {
                      await signOut(auth);
                    } catch (err) {
                      console.error("❌ Error cerrando sesión:", err);
                    }
                  } else if (estadoActual === "pendiente" || estadoActual === "rechazado") {
                    console.log(`❌ Estado cambiado a "${estadoActual}" en tiempo real - Cerrando sesión...`);
                    setBlockNavigation(true);
                    if (estadoActual === "pendiente") {
                      setShowPendingModal(true);
                    } else {
                      setShowRejectedModal(true);
                    }
                    try {
                      await signOut(auth);
                    } catch (err) {
                      console.error("❌ Error cerrando sesión:", err);
                    }
                  }
                }
              },
              (error) => {
                console.error("Error en listener de Firestore:", error);
              }
            );
          } else {
            console.log("Usuario no existe en Firestore - BLOQUEANDO NAVEGACIÓN");
            setRole(null);
            setBlockNavigation(true);
          }
        } catch (err) {
          console.log("Error al obtener el rol del usuario:", err);
          setRole("user");
        }
      } else {
        setRole(null);
        setBlockNavigation(false);
        setSessionPending(false);
      }

      setLoadingAuth(false);
    });

    return () => {
      unsub();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, [sessionPending]);

  return (
    <AuthContext.Provider value={{
      user, setUser,
      role, setRole,
      blockNavigation, setBlockNavigation,
      sessionPending, setSessionPending,
      loadingAuth,
      showDeletedModal, setShowDeletedModal,
      showDeactivatedModal, setShowDeactivatedModal,
      showPendingModal, setShowPendingModal,
      showRejectedModal, setShowRejectedModal,
      showSessionModal, setShowSessionModal,
    }}>
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