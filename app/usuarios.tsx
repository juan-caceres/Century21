//app/usuarios.tsx
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, Modal, TextInput } from "react-native";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc, DocumentData, deleteDoc, query, where } from "firebase/firestore";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, useAuth } from "../App";
import { getAuth } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";

type UsuariosScreenNavigationProp = StackNavigationProp<RootStackParamList, "Usuarios">;
type Props = { navigation: UsuariosScreenNavigationProp };

type Usuario = {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt?: any;
};

type FiltroRol = 'todos' | 'admin' | 'noAdmin';

const Usuarios: React.FC<Props> = ({ navigation }) => {
  const { role } = useAuth(); 
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'promote' | 'demote' | 'delete' | 'editUsername' | 'infoEmail' | null>(null);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [message, setMessage] = useState({ text: '', type: 'success' as 'success' | 'error' });
  
  // Estados para búsqueda y filtros
  const [searchText, setSearchText] = useState('');
  const [filtroRol, setFiltroRol] = useState<FiltroRol>('todos');
  
  // Estado para edición de username
  const [nuevoUsername, setNuevoUsername] = useState('');
  const [errorUsername, setErrorUsername] = useState('');

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
          username: data.username || data.email.split('@')[0],
          role: data.role,
          createdAt: data.createdAt
        });
      });
      lista.sort((a, b) => a.email.localeCompare(b.email));
      setUsuarios(lista);
      aplicarFiltros(lista, searchText, filtroRol);
    } catch (e) {
      console.log("Error cargando usuarios:", e);
      showMessage("No se pudieron cargar los usuarios", "error");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = (listaUsuarios: Usuario[], busqueda: string, filtro: FiltroRol) => {
    let resultado = [...listaUsuarios];
    
    if (busqueda.trim() !== '') {
      resultado = resultado.filter(u => 
        u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.username.toLowerCase().includes(busqueda.toLowerCase())
      );
    }
    
    if (filtro === 'admin') {
      resultado = resultado.filter(u => u.role === 'admin' || u.role === 'superuser');
    } else if (filtro === 'noAdmin') {
      resultado = resultado.filter(u => u.role === 'user');
    }
    
    setUsuariosFiltrados(resultado);
  };

  useEffect(() => {
    aplicarFiltros(usuarios, searchText, filtroRol);
  }, [searchText, filtroRol, usuarios]);

  const openModal = (type: 'promote' | 'demote' | 'delete' | 'editUsername' | 'infoEmail', user?: Usuario) => {
    setModalType(type);
    
    if (type === 'infoEmail') {
      setSelectedUser(null);
    } else if (user) {
      setSelectedUser(user);
      if (type === 'editUsername') {
        setNuevoUsername(user.username);
        setErrorUsername('');
      }
    }
    
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalType(null);
    setSelectedUser(null);
    setNuevoUsername('');
    setErrorUsername('');
  };

  const validarUsername = async (username: string): Promise<boolean> => {
    const trimmedUsername = username.trim();
    
    // Validar que no sea el mismo
    if (trimmedUsername === selectedUser?.username) {
      setErrorUsername("❌ Este ya es tu nombre de usuario actual");
      return false;
    }

    // Validar longitud mínima
    if (trimmedUsername.length < 3) {
      setErrorUsername("Mínimo 3 caracteres");
      return false;
    }

    // Validar longitud máxima
    if (trimmedUsername.length > 20) {
      setErrorUsername("Máximo 20 caracteres");
      return false;
    }

    // Validar formato
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      setErrorUsername("Solo letras, números y guion bajo (_)");
      return false;
    }
    
    // Verificar si ya existe
    try {
      const q = query(collection(db, "users"), where("username", "==", trimmedUsername));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty && snapshot.docs[0].id !== selectedUser?.id) {
        setErrorUsername(`El nombre de usuario "@${trimmedUsername}" ya está en uso`);
        return false;
      }
    } catch (error) {
      console.log("Error validando username:", error);
      setErrorUsername("Error al verificar disponibilidad");
      return false;
    }
    
    setErrorUsername('');
    return true;
  };

  const handleAction = async () => {
    if (!selectedUser || !modalType) return;

    try {
      switch (modalType) {
        case 'promote':
          await updateDoc(doc(db, "users", selectedUser.id), { role: "admin" });
          showMessage("Usuario promovido a administrador", "success");
          fetchUsuarios();
          closeModal();
          break;
        case 'demote':
          await updateDoc(doc(db, "users", selectedUser.id), { role: "user" });
          showMessage("Privilegios de administrador removidos", "success");
          fetchUsuarios();
          closeModal();
          break;
        case 'delete':
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (currentUser && currentUser.uid !== selectedUser.id) {
            await deleteDoc(doc(db, "users", selectedUser.id));
            showMessage("Usuario eliminado correctamente", "success");
            fetchUsuarios();
            closeModal();
          } else {
            showMessage("No puedes eliminar tu propia cuenta", "error");
            closeModal();
          }
          break;
        case 'editUsername':
          const isValid = await validarUsername(nuevoUsername.trim());
          if (!isValid) {
            // NO cerrar el modal, solo mostrar el error
            return;
          }
          // Si es válido, guardar y cerrar
          await updateDoc(doc(db, "users", selectedUser.id), { 
            username: nuevoUsername.trim()
          });
          showMessage("✅ Username actualizado correctamente", "success");
          fetchUsuarios();
          closeModal();
          break;
      }
    } catch (e) {
      console.log("Error en acción:", e);
      showMessage("Error al realizar la acción", "error");
      closeModal();
    }
  };

  const getModalContent = () => {
    if (!selectedUser || !modalType) return { title: '', message: '', action: '', color: '' };

    switch (modalType) {
      case 'promote':
        return {
          title: 'Promover a Admin',
          message: `¿Promover a ${selectedUser.username} (${selectedUser.email}) como administrador?`,
          action: 'Promover',
          color: '#4CAF50'
        };
      case 'demote':
        return {
          title: 'Quitar Admin',
          message: `¿Quitar privilegios de administrador a ${selectedUser.username}?`,
          action: 'Quitar Admin',
          color: '#ff9800'
        };
      case 'delete':
        return {
          title: 'Eliminar Usuario',
          message: `¿Estás seguro que quieres eliminar a ${selectedUser.username} (${selectedUser.email})? Esta acción no se puede deshacer.`,
          action: 'Eliminar',
          color: '#ff6b6b'
        };
      case 'editUsername':
        return {
          title: 'Editar Nombre de Usuario',
          message: '',
          action: 'Guardar',
          color: '#4CAF50'
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

  const limpiarFiltros = () => {
    setSearchText('');
    setFiltroRol('todos');
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  if (role !== "superuser") {
    return (
      <View style={styles.container}>
        <Text style={styles.accessDenied}>Acceso denegado</Text>
      </View>
    );
  }

  const modalContent = getModalContent();
  const hayFiltrosActivos = searchText !== '' || filtroRol !== 'todos';

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

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#BEAF87" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por username o email..."
          placeholderTextColor="#888"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
        />
        {searchText !== '' && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros por rol */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filtroRol === 'todos' && styles.filterButtonActive
          ]}
          onPress={() => setFiltroRol('todos')}
        >
          <Text style={[
            styles.filterButtonText,
            filtroRol === 'todos' && styles.filterButtonTextActive
          ]}>
            Todos ({usuarios.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filtroRol === 'admin' && styles.filterButtonActive
          ]}
          onPress={() => setFiltroRol('admin')}
        >
          <Text style={[
            styles.filterButtonText,
            filtroRol === 'admin' && styles.filterButtonTextActive
          ]}>
            Admins ({usuarios.filter(u => u.role === 'admin' || u.role === 'superuser').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filtroRol === 'noAdmin' && styles.filterButtonActive
          ]}
          onPress={() => setFiltroRol('noAdmin')}
        >
          <Text style={[
            styles.filterButtonText,
            filtroRol === 'noAdmin' && styles.filterButtonTextActive
          ]}>
            Usuarios ({usuarios.filter(u => u.role === 'user').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botón para limpiar filtros */}
      {hayFiltrosActivos && (
        <TouchableOpacity 
          style={styles.clearFiltersButton}
          onPress={limpiarFiltros}
        >
          <Ionicons name="refresh" size={16} color="#BEAF87" style={{ marginRight: 6 }} />
          <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
        </TouchableOpacity>
      )}

      {/* Contador de resultados */}
      <View style={styles.resultsCounter}>
        <Text style={styles.resultsCounterText}>
          Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
        </Text>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Cargando usuarios...</Text>
      ) : usuariosFiltrados.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color="#888" />
          <Text style={styles.emptyText}>
            {searchText !== '' 
              ? "No se encontraron usuarios" 
              : "No hay usuarios en esta categoría"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={usuariosFiltrados}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.userInfo}>
                {/* Username con botón de edición */}
                <View style={styles.usernameRow}>
                  <Ionicons name="person" size={18} color="#BEAF87" style={{ marginRight: 6 }} />
                  <Text style={styles.username}>@{item.username}</Text>
                  <TouchableOpacity
                    onPress={() => openModal('editUsername', item)}
                    style={styles.editButton}
                  >
                    <Ionicons name="pencil" size={16} color="#BEAF87" />
                  </TouchableOpacity>
                </View>

                {/* Email con botón de info */}
                <View style={styles.emailRow}>
                  <Ionicons name="mail" size={16} color="#888" style={{ marginRight: 6 }} />
                  <Text style={styles.email}>{item.email}</Text>
                  <TouchableOpacity
                    onPress={() => openModal('infoEmail')}
                    style={styles.infoButton}
                  >
                    <Ionicons name="information-circle" size={18} color="#888" />
                  </TouchableOpacity>
                </View>
                
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

      {/* Modal principal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {modalType === 'infoEmail' ? (
              // Modal de información del email
              <>
                <View style={styles.iconContainer}>
                  <Ionicons name="information-circle" size={48} color="#BEAF87" />
                </View>
                <Text style={styles.modalTitle}>Email no editable</Text>
                <Text style={styles.infoModalText}>
                  ⚠️ El email <Text style={{ fontWeight: 'bold' }}>no puede modificarse</Text>.
                </Text>
                <Text style={styles.infoModalText}>
                  ✅ Puedes editar el <Text style={{ fontWeight: 'bold' }}>NOMBRE DE USUARIO</Text> para cambiar cómo se identifica el usuario.
                </Text>
                <Text style={styles.infoModalText}>
                  🔒 El email es <Text style={{ fontWeight: 'bold' }}>permanente</Text> por razones de seguridad.
                </Text>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#BEAF87', width: '100%' }]}
                  onPress={closeModal}
                >
                  <Text style={styles.modalButtonText}>Entendido</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Modales normales (editar, eliminar, promover)
              <>
                <Text style={styles.modalTitle}>{modalContent.title}</Text>
                
                {modalType === 'editUsername' ? (
                  <View style={styles.editContainer}>
                    <Text style={styles.modalMessage}>
                      Nombre de Usuario actual: <Text style={{ color: '#BEAF87', fontWeight: 'bold' }}>@{selectedUser?.username}</Text>
                    </Text>
                    
                    <View style={styles.inputContainer}>
                      <Ionicons name="at" size={20} color="#BEAF87" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.input}
                        placeholder="Nuevo username"
                        placeholderTextColor="#888"
                        value={nuevoUsername}
                        onChangeText={(text) => {
                          setNuevoUsername(text);
                          setErrorUsername('');
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={20}
                      />
                    </View>

                    <Text style={styles.helpText}>
                      3-20 caracteres • Letras, números y _
                    </Text>
                    
                    {errorUsername !== '' && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color="#ff6b6b" style={{ marginRight: 6 }} />
                        <Text style={styles.errorText}>{errorUsername}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.modalMessage}>{modalContent.message}</Text>
                )}
                
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
              </>
            )}
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
    marginBottom: 20,
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
    marginBottom: 15,
    alignItems: "center",
  },
  messageText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#252526",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#BEAF87",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    paddingVertical: 12,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 15,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#252526",
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#BEAF87",
    borderColor: "#BEAF87",
  },
  filterButtonText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
  },
  filterButtonTextActive: {
    color: "#000",
    fontWeight: "bold",
  },
  clearFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginBottom: 10,
  },
  clearFiltersText: {
    color: "#BEAF87",
    fontSize: 14,
    fontWeight: "600",
  },
  resultsCounter: {
    paddingVertical: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  resultsCounterText: {
    color: "#888",
    fontSize: 13,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 15,
    paddingHorizontal: 40,
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
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  username: {
    fontSize: 18,
    color: "#BEAF87",
    fontWeight: "bold",
    flex: 1,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  email: { 
    fontSize: 14, 
    color: "#aaa",
    flex: 1,
  },
  editButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#BEAF87",
    marginLeft: 10,
  },
  infoButton: {
    padding: 4,
    marginLeft: 8,
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
    maxWidth: 400,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 15,
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
  infoModalText: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  editContainer: {
    width: "100%",
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2e2e2e",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#BEAF87",
  },
  input: {
    flex: 1,
    color: "#fff",
    paddingVertical: 12,
    fontSize: 16,
  },
  helpText: {
    color: "#888",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingHorizontal: 10,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
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