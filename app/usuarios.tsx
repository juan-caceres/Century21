//app/usuarios.tsx
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, Modal } from "react-native";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc, DocumentData, deleteDoc } from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, useAuth } from "../App";
import { getAuth, deleteUser } from "firebase/auth";

type UsuariosScreenNavigationProp = StackNavigationProp<RootStackParamList, "Usuarios">;
type Props = { navigation: UsuariosScreenNavigationProp };

type Usuario = {
  id: string;
  email: string;
  role: string;
  createdAt?: any;
};

const Usuarios: React.FC<Props> = ({ navigation }) => {
  const { role } = useAuth(); 
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'promote' | 'demote' | 'delete' | null>(null);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [message, setMessage] = useState({ text: '', type: 'success' as 'success' | 'error' });

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: 'success' }), 3000);
  };

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const querySnap = await getDocs(collection(db, "users"));
      const lista: Usuario[] = [];
      querySnap.forEach((docu) => {
        const data = docu.data() as DocumentData;
        lista.push({ 
          id: docu.id, 
          email: data.email, 
          role: data.role,
          createdAt: data.createdAt
        });
      });
      // Ordenar por email
      lista.sort((a, b) => a.email.localeCompare(b.email));
      setUsuarios(lista);
    } catch (e) {
      console.log("Error cargando usuarios:", e);
      showMessage("No se pudieron cargar los usuarios", "error");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: 'promote' | 'demote' | 'delete', user: Usuario) => {
    setModalType(type);
    setSelectedUser(user);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalType(null);
    setSelectedUser(null);
  };

const handleAction = async () => {
  if (!selectedUser || !modalType) return;

  try {
    switch (modalType) {
      case 'promote':
        await updateDoc(doc(db, "users", selectedUser.id), { role: "admin" });
        showMessage("Usuario promovido a administrador", "success");
        break;
      case 'demote':
        await updateDoc(doc(db, "users", selectedUser.id), { role: "user" });
        showMessage("Privilegios de administrador removidos", "success");
        break;
      case 'delete':
        console.log("Eliminando usuario con ID:", selectedUser.id);  // Log de depuración
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid !== selectedUser.id) {
        await deleteDoc(doc(db, "users", selectedUser.id));
        showMessage("Usuario eliminado correctamente", "success");
        } else {
          showMessage("No puedes eliminar tu propia cuenta", "error");
        }
        break;
    }
    fetchUsuarios();
  } catch (e) {
    console.log("Error en acción:", e);  // Log de error
    showMessage("Error al realizar la acción", "error");
  } finally {
    closeModal();
  }
};

  const getModalContent = () => {
    if (!selectedUser || !modalType) return { title: '', message: '', action: '', color: '' };

    switch (modalType) {
      case 'promote':
        return {
          title: 'Promover a Admin',
          message: `¿Promover a ${selectedUser.email} como administrador?`,
          action: 'Promover',
          color: '#4CAF50'
        };
      case 'demote':
        return {
          title: 'Quitar Admin',
          message: `¿Quitar privilegios de administrador a ${selectedUser.email}?`,
          action: 'Quitar Admin',
          color: '#ff9800'
        };
      case 'delete':
        return {
          title: 'Eliminar Usuario',
          message: `¿Estás seguro que quieres eliminar a ${selectedUser.email}? Esta acción no se puede deshacer.`,
          action: 'Eliminar',
          color: '#ff6b6b'
        };
      default:
        return { title: '', message: '', action: '', color: '' };
    }
  };

  const getRoleText = (userRole: string) => {
    switch (userRole) {
      case "superuser": return "Superusuario";
      case "admin": return "Administrador";
      default: return "Usuario";
    }
  };

  const getRoleColor = (userRole: string) => {
    switch (userRole) {
      case "superuser": return "#ff6b6b";
      case "admin": return "#4CAF50";
      default: return "#BEAF87";
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // Solo el superusuario puede acceder
  if (role !== "superuser") {
    return (
      <View style={styles.container}>
        <Text style={styles.accessDenied}>Acceso denegado</Text>
      </View>
    );
  }

  const modalContent = getModalContent();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.backButtonText}>← Inicio</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Gestión de Usuarios</Text>
        
        <View style={styles.placeholder} />
      </View>

      {/* Mensaje de feedback */}
      {message.text !== '' && (
        <View style={[
          styles.messageContainer,
          { backgroundColor: message.type === "success" ? "#4CAF50" : "#ff6b6b" }
        ]}>
          <Text style={styles.messageText}>{message.text}</Text>
        </View>
      )}

      {loading ? (
        <Text style={styles.loadingText}>Cargando usuarios...</Text>
      ) : usuarios.length === 0 ? (
        <Text style={styles.emptyText}>No hay usuarios registrados</Text>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.userInfo}>
                <Text style={styles.email}>{item.email}</Text>
                <View style={[
                  styles.roleBadge,
                  { backgroundColor: getRoleColor(item.role) }
                ]}>
                  <Text style={styles.roleText}>{getRoleText(item.role)}</Text>
                </View>
              </View>

              <View style={styles.actionButtons}>
                {item.role === "user" && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.promoteButton]}
                    onPress={() => openModal('promote', item)}
                  >
                    <Text style={styles.actionButtonText}>Hacer Admin</Text>
                  </TouchableOpacity>
                )}

                {item.role === "admin" && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.demoteButton]}
                    onPress={() => openModal('demote', item)}
                  >
                    <Text style={styles.actionButtonText}>Quitar Admin</Text>
                  </TouchableOpacity>
                )}

                {item.role !== "superuser" && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => openModal('delete', item)}
                  >
                    <Text style={[styles.actionButtonText, { color: "#fff" }]}>
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Modal de confirmación */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalContent.title}</Text>
            <Text style={styles.modalMessage}>{modalContent.message}</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: modalContent.color }]}
                onPress={handleAction}
              >
                <Text style={styles.modalButtonText}>{modalContent.action}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={closeModal}
              >
                <Text style={styles.cancelModalButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#ffffffff", 
    padding: 20,
    paddingTop: height > 700 ? 70 : 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: "#BEAF87",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 14,
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    color: "#BEAF87",
    textAlign: "center",
    flex: 1,
  },
  placeholder: {
    width: 80,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  messageText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  accessDenied: {
    fontSize: 20,
    color: "#ff6b6b",
    textAlign: "center",
    marginTop: 50,
  },
  loadingText: {
    fontSize: 16,
    color: "#BEAF87",
    textAlign: "center",
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
  card: {
    backgroundColor: "#252526",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#BEAF87",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    marginBottom: 15,
  },
  email: { 
    fontSize: 16, 
    color: "#fff",
    fontWeight: "500",
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  promoteButton: {
    backgroundColor: "#4CAF50",
  },
  demoteButton: {
    backgroundColor: "#ff9800",
  },
  deleteButton: {
    backgroundColor: "#ff6b6b",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContent: {
    backgroundColor: "#1c1c1c",
    padding: 25,
    borderRadius: 15,
    width: "85%",
    alignItems: "center",
  },
  modalTitle: {
    color: "#BEAF87",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalMessage: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelModalButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#BEAF87",
  },
  cancelModalButtonText: {
    color: "#BEAF87",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default Usuarios;