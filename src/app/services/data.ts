import { Injectable, signal, computed, effect } from '@angular/core';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  role: 'client' | 'admin';
  cpf?: string;
}

export interface LaborService {
  id: string;
  name: string;
  price: number;
  description: string;
}

export type DeviceType = 'Notebook' | 'Desktop PC' | 'Placa-Mãe' | 'Outro';

export type RepairStatus = 
  | 'Recebido' 
  | 'Em Diagnóstico' 
  | 'Em Reparo' 
  | 'Testes Finais' 
  | 'Pronto para Retirada' 
  | 'Entregue';

export interface PartUsed {
  name: string;
  price: number;
}

export interface RepairHistoryEntry {
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
}

export interface Repair {
  id: string; // OS-XXXX
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  deviceType: DeviceType;
  deviceBrandModel: string;
  description: string;
  urgency: 'Baixa' | 'Média' | 'Alta';
  status: RepairStatus;
  technicianComments: string;
  createdAt: string;
  estimatedPrice: number;
  finalPrice: number;
  partsUsed: PartUsed[];
  photosBefore?: string[];
  photosAfter?: string[];
  history?: RepairHistoryEntry[];
}

export interface Part {
  id: string;
  name: string;
  category: 'Notebook' | 'Desktop' | 'Armazenamento' | 'Memória' | 'Processador' | 'Acessórios';
  price: number;
  stock: number;
  imageUrl: string;
  description: string;
}

export interface Testimonial {
  id: string;
  name: string;
  avatarUrl: string;
  rating: number;
  comment: string;
  date: string;
}

export interface CartItem {
  part: Part;
  quantity: number;
}

const INITIAL_LABOR_SERVICES: LaborService[] = [
  { id: 'L001', name: 'Formatação Simples', price: 90.00, description: 'Instalação de Sistema Operacional (Windows/Linux) com drivers.' },
  { id: 'L002', name: 'Formatação + Limpeza Física', price: 150.00, description: 'Formatação completa do sistema mais limpeza interna e troca de pasta térmica.' },
  { id: 'L003', name: 'Troca de Tela (Notebook)', price: 180.00, description: 'Mão de obra qualificada para desmontagem e troca de tela de notebook.' },
  { id: 'L004', name: 'Troca de Bateria (Notebook)', price: 70.00, description: 'Mão de obra para troca de bateria interna ou externa.' },
  { id: 'L005', name: 'Limpeza Interna Avançada', price: 120.00, description: 'Remoção de poeira, desoxidação leve com álcool isopropílico e troca de pasta térmica.' },
  { id: 'L006', name: 'Reparo de Dobradiça e Carcaça', price: 200.00, description: 'Reconstrução estrutural com resina acrílica e ajuste de pressão das dobradiças.' }
];

const INITIAL_PARTS: Part[] = [
  {
    id: 'P001',
    name: 'SSD Kingston NV2 1TB NVMe M.2 2280',
    category: 'Armazenamento',
    price: 389.90,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?auto=format&fit=crop&w=400&q=80',
    description: 'Leitura de até 3500MB/s e gravação de até 2100MB/s. Upgrade de alto desempenho para notebooks e desktops.'
  },
  {
    id: 'P002',
    name: 'Memória RAM Corsair Vengeance 16GB DDR4 3200MHz',
    category: 'Memória',
    price: 299.90,
    stock: 24,
    imageUrl: 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=400&q=80',
    description: 'Dissipador de calor em alumínio puro, otimizado para o máximo desempenho nas plataformas Intel e AMD.'
  },
  {
    id: 'P003',
    name: 'SSD Sata III Crucial BX500 480GB',
    category: 'Armazenamento',
    price: 219.00,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=400&q=80',
    description: 'Ideal para ressuscitar notebooks antigos com HD mecânico. Inicialização até 4 vezes mais rápida.'
  },
  {
    id: 'P004',
    name: 'Processador AMD Ryzen 5 5600X (3.7GHz / 4.6GHz)',
    category: 'Processador',
    price: 829.90,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80',
    description: '6 núcleos e 12 threads. Perfeito para games exigentes e multitarefas pesadas em computadores de mesa.'
  },
  {
    id: 'P005',
    name: 'Carregador Universal para Notebook Slim 90W',
    category: 'Notebook',
    price: 119.90,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=400&q=80',
    description: 'Acompanha 10 pinos compatíveis com as principais marcas (Dell, HP, Lenovo, Asus, Acer, Samsung).'
  },
  {
    id: 'P006',
    name: 'Cooler para Processador Deepcool Gammaxx AG400',
    category: 'Desktop',
    price: 139.90,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80',
    description: 'Excelente capacidade de dissipação com 4 heatpipes e fan de 120mm PWM super silencioso.'
  },
  {
    id: 'P007',
    name: 'Teclado para Notebook Dell Inspiron Series',
    category: 'Notebook',
    price: 89.90,
    stock: 5,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=400&q=80',
    description: 'Layout ABNT2 com Ç. Peça de reposição de alta qualidade com digitação macia.'
  },
  {
    id: 'P008',
    name: 'Mouse Gamer Logitech G203 Lightsync RGB',
    category: 'Acessórios',
    price: 149.90,
    stock: 18,
    imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=400&q=80',
    description: 'Sensor de alta precisão com até 8.000 DPI, iluminação RGB programável e 6 botões personalizáveis.'
  }
];

const INITIAL_TESTIMONIALS: Testimonial[] = [
  {
    id: 'T1',
    name: 'Carlos Oliveira',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
    rating: 5,
    comment: 'Atendimento nota 1000! Trocaram a tela do meu notebook Dell em menos de 24 horas e o preço foi super justo. Recomendo muito!',
    date: '12/07/2026'
  },
  {
    id: 'T2',
    name: 'Mariana Santos',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
    rating: 5,
    comment: 'Levei meu computador de edição que não ligava mais. O técnico diagnosticou que era curto na placa-mãe, fez a soldagem e consertou em 2 dias. Economizei uma fortuna que gastaria numa nova.',
    date: '08/07/2026'
  },
  {
    id: 'T3',
    name: 'Felipe Souza',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
    rating: 4,
    comment: 'Excelente loja para comprar peças. Comprei um SSD e memória RAM para meu notebook e eles mesmos instalaram de forma rápida. Ótimo custo-benefício.',
    date: '30/06/2026'
  }
];

const INITIAL_REPAIRS: Repair[] = [
  {
    id: 'OS-1024',
    clientId: 'U002',
    clientName: 'Carlos Oliveira',
    clientPhone: '11999998888',
    clientEmail: 'carlos@email.com',
    deviceType: 'Notebook',
    deviceBrandModel: 'Dell Inspiron 15 3525',
    description: 'Tela piscando e dobradiça esquerda solta estalando ao abrir.',
    urgency: 'Alta',
    status: 'Pronto para Retirada',
    technicianComments: 'Recuperação estrutural da carcaça realizada com resina especial. Substituição do cabo flat da tela por um novo de alta durabilidade. Testes de estresse da dobradiça ok.',
    createdAt: '2026-07-15T10:30:00.000Z',
    estimatedPrice: 320.00,
    finalPrice: 350.00,
    partsUsed: [{ name: 'Cabo Flat Tela Dell Inspiron 15', price: 80.00 }],
    photosBefore: [
      'https://images.unsplash.com/photo-1544006659-f0b21f04cb1d?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=600&q=80'
    ],
    photosAfter: [
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80'
    ]
  },
  {
    id: 'OS-1025',
    clientId: 'U003',
    clientName: 'Mariana Santos',
    clientPhone: '11977776666',
    clientEmail: 'mariana@email.com',
    deviceType: 'Desktop PC',
    deviceBrandModel: 'Gamer Ryzen 7 + RTX 3070 Custom',
    description: 'Computador desliga sozinho após cerca de 15 minutos jogando ou renderizando vídeo. Cooler faz muito barulho.',
    urgency: 'Média',
    status: 'Em Reparo',
    technicianComments: 'Detectado superaquecimento severo no processador (atingindo 98°C). Realizando limpeza completa de poeira nos filtros e dissipadores e troca da pasta térmica original seca por pasta de alta condutividade térmica Noctua NT-H1.',
    createdAt: '2026-07-17T14:22:00.000Z',
    estimatedPrice: 180.00,
    finalPrice: 180.00,
    partsUsed: [],
    photosBefore: [
      'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=600&q=80'
    ],
    photosAfter: []
  },
  {
    id: 'OS-1026',
    clientId: 'U002',
    clientName: 'Carlos Oliveira',
    clientPhone: '11999998888',
    clientEmail: 'carlos@email.com',
    deviceType: 'Notebook',
    deviceBrandModel: 'MacBook Air M1 2020',
    description: 'Limpeza interna preventiva e formatação com atualização do macOS.',
    urgency: 'Baixa',
    status: 'Entregue',
    technicianComments: 'Desoxidação leve preventiva do cooler e conector de bateria. Formatação limpa do macOS Sonoma efetuada com backup e restauración de arquivos do usuário conforme solicitado.',
    createdAt: '2026-07-10T09:00:00.000Z',
    estimatedPrice: 220.00,
    finalPrice: 220.00,
    partsUsed: [],
    photosBefore: [
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80'
    ],
    photosAfter: [
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=600&q=80'
    ]
  }
];

const INITIAL_USERS = [
  {
    id: 'U001',
    name: 'Técnico Administrador',
    email: 'admin@infotech.com',
    phone: '11988887777',
    username: 'tecnico',
    password: '123',
    role: 'admin' as const
  },
  {
    id: 'U002',
    name: 'Carlos Oliveira',
    email: 'carlos@email.com',
    phone: '11999998888',
    username: 'cliente',
    password: '123',
    role: 'client' as const,
    cpf: '123.456.789-10'
  },
  {
    id: 'U003',
    name: 'Mariana Santos',
    email: 'mariana@email.com',
    phone: '11977776666',
    username: 'mariana',
    password: '123',
    role: 'client' as const,
    cpf: '987.654.321-00'
  }
];

@Injectable({
  providedIn: 'root'
})
export class DataStore {
  // Signals for state
  private usersState = signal<(User & { password?: string })[]>([]);
  private repairsState = signal<Repair[]>([]);
  private partsState = signal<Part[]>([]);
  private testimonialsState = signal<Testimonial[]>([]);
  private activeUserState = signal<User | null>(null);
  private cartState = signal<CartItem[]>([]);
  private laborServicesState = signal<LaborService[]>([]);

  // Exposed read-only views
  users = computed(() => this.usersState());
  laborServices = computed(() => this.laborServicesState());
  repairs = computed(() => this.repairsState());
  parts = computed(() => this.partsState());
  testimonials = computed(() => this.testimonialsState());
  currentUser = computed(() => this.activeUserState());
  cart = computed(() => this.cartState());

  // Derived signals
  cartTotal = computed(() => {
    return this.cartState().reduce((sum, item) => sum + (item.part.price * item.quantity), 0);
  });

  cartCount = computed(() => {
    return this.cartState().reduce((sum, item) => sum + item.quantity, 0);
  });

  constructor() {
    this.loadFromStorage();

    // Set up effects to automatically sync changes to localStorage
    effect(() => {
      if (typeof window === 'undefined') return;
      localStorage.setItem('infotech_users', JSON.stringify(this.usersState()));
    });
    effect(() => {
      if (typeof window === 'undefined') return;
      localStorage.setItem('infotech_repairs', JSON.stringify(this.repairsState()));
    });
    effect(() => {
      if (typeof window === 'undefined') return;
      localStorage.setItem('infotech_parts', JSON.stringify(this.partsState()));
    });
    effect(() => {
      if (typeof window === 'undefined') return;
      localStorage.setItem('infotech_testimonials', JSON.stringify(this.testimonialsState()));
    });
    effect(() => {
      if (typeof window === 'undefined') return;
      localStorage.setItem('infotech_labor_services', JSON.stringify(this.laborServicesState()));
    });
    effect(() => {
      if (typeof window === 'undefined') return;
      const active = this.activeUserState();
      if (active) {
        localStorage.setItem('infotech_current_user', JSON.stringify(active));
      } else {
        localStorage.removeItem('infotech_current_user');
      }
    });
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') {
      this.usersState.set(INITIAL_USERS);
      this.repairsState.set(INITIAL_REPAIRS);
      this.partsState.set(INITIAL_PARTS);
      this.testimonialsState.set(INITIAL_TESTIMONIALS);
      this.activeUserState.set(null);
      return;
    }

    // Users
    const localUsers = localStorage.getItem('infotech_users');
    if (localUsers) {
      this.usersState.set(JSON.parse(localUsers));
    } else {
      this.usersState.set(INITIAL_USERS);
    }

    // Repairs
    const localRepairs = localStorage.getItem('infotech_repairs');
    if (localRepairs) {
      this.repairsState.set(JSON.parse(localRepairs));
    } else {
      this.repairsState.set(INITIAL_REPAIRS);
    }

    // Parts
    const localParts = localStorage.getItem('infotech_parts');
    if (localParts) {
      this.partsState.set(JSON.parse(localParts));
    } else {
      this.partsState.set(INITIAL_PARTS);
    }

    // Testimonials
    const localTestimonials = localStorage.getItem('infotech_testimonials');
    if (localTestimonials) {
      this.testimonialsState.set(JSON.parse(localTestimonials));
    } else {
      this.testimonialsState.set(INITIAL_TESTIMONIALS);
    }

    // Labor Services
    const localLaborServices = localStorage.getItem('infotech_labor_services');
    if (localLaborServices) {
      this.laborServicesState.set(JSON.parse(localLaborServices));
    } else {
      this.laborServicesState.set(INITIAL_LABOR_SERVICES);
    }

    // Active User Session
    const localActiveUser = localStorage.getItem('infotech_current_user');
    if (localActiveUser) {
      this.activeUserState.set(JSON.parse(localActiveUser));
    }
  }

  // Session Methods
  login(username: string, password: string): { success: boolean; error?: string } {
    const user = this.usersState().find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (user) {
      const userSession: User = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        username: user.username,
        role: user.role
      };
      this.activeUserState.set(userSession);
      return { success: true };
    }
    return { success: false, error: 'Usuário ou senha incorretos.' };
  }

  register(name: string, email: string, phone: string, username: string, password: string, cpf?: string): { success: boolean; error?: string } {
    const users = this.usersState();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, error: 'Este nome de usuário já está cadastrado.' };
    }
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Este email já está cadastrado.' };
    }
    if (cpf && users.some(u => u.cpf === cpf)) {
      return { success: false, error: 'Este CPF já está cadastrado.' };
    }

    const newUser = {
      id: 'U' + String(users.length + 1).padStart(3, '0'),
      name,
      email,
      phone,
      username,
      password,
      role: 'client' as const,
      cpf
    };

    this.usersState.update(u => [...u, newUser]);
    
    // Auto login
    this.login(username, password);
    return { success: true };
  }

  logout() {
    this.activeUserState.set(null);
  }

  // Repair / Ticket CRUD Methods
  createRepairRequest(repairData: Omit<Repair, 'id' | 'status' | 'technicianComments' | 'createdAt' | 'finalPrice' | 'partsUsed'>): Repair {
    const repairs = this.repairsState();
    
    // Generate simple random/sequenced OS number
    const nextNum = repairs.length > 0 
      ? Math.max(...repairs.map(r => parseInt(r.id.split('-')[1]) || 1000)) + 1 
      : 1027;
    const newOsId = `OS-${nextNum}`;

    const newRepair: Repair = {
      ...repairData,
      id: newOsId,
      status: 'Recebido',
      technicianComments: 'Aguardando avaliação técnica preliminar.',
      createdAt: new Date().toISOString(),
      finalPrice: repairData.estimatedPrice,
      partsUsed: [],
      photosBefore: [],
      photosAfter: [],
      history: [
        {
          timestamp: new Date().toISOString(),
          field: 'Status',
          oldValue: '',
          newValue: 'Recebido (Ordem de serviço aberta)',
          changedBy: repairData.clientName || 'Cliente'
        }
      ]
    };

    this.repairsState.update(r => [newRepair, ...r]);
    return newRepair;
  }

  updateRepair(osId: string, updatedData: Partial<Repair>) {
    this.repairsState.update(repairs => 
      repairs.map(r => {
        if (r.id === osId) {
          const history = r.history ? [...r.history] : [];
          const currentUser = this.activeUserState();
          const changedBy = currentUser ? currentUser.name : 'Sistema';
          const timestamp = new Date().toISOString();

          // Monitor status changes
          if (updatedData.status !== undefined && updatedData.status !== r.status) {
            history.push({
              timestamp,
              field: 'Status',
              oldValue: r.status,
              newValue: updatedData.status,
              changedBy
            });
          }

          // Monitor technician comments (notes) changes
          if (updatedData.technicianComments !== undefined && updatedData.technicianComments !== r.technicianComments) {
            history.push({
              timestamp,
              field: 'Notas Técnicas',
              oldValue: r.technicianComments || '(Sem observações)',
              newValue: updatedData.technicianComments || '(Sem observações)',
              changedBy
            });
          }

          // Monitor description changes (if edited by client)
          if (updatedData.description !== undefined && updatedData.description !== r.description) {
            history.push({
              timestamp,
              field: 'Descrição',
              oldValue: r.description,
              newValue: updatedData.description,
              changedBy
            });
          }

          return { ...r, ...updatedData, history };
        }
        return r;
      })
    );
  }

  deleteRepair(osId: string) {
    this.repairsState.update(repairs => repairs.filter(r => r.id !== osId));
  }

  // Part CRUD Methods
  createPart(part: Omit<Part, 'id'>) {
    const parts = this.partsState();
    const nextId = 'P' + String(parts.length + 1).padStart(3, '0');
    const newPart: Part = { ...part, id: nextId };
    this.partsState.update(p => [...p, newPart]);
  }

  updatePart(partId: string, updatedData: Partial<Part>) {
    this.partsState.update(parts => 
      parts.map(p => p.id === partId ? { ...p, ...updatedData } : p)
    );
  }

  deletePart(partId: string) {
    this.partsState.update(parts => parts.filter(p => p.id !== partId));
  }

  // Testimonial Methods
  addTestimonial(name: string, rating: number, comment: string) {
    const nextId = 'T' + String(this.testimonialsState().length + 1);
    const newTestimonial: Testimonial = {
      id: nextId,
      name,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80`,
      rating,
      comment,
      date: new Date().toLocaleDateString('pt-BR')
    };
    this.testimonialsState.update(t => [newTestimonial, ...t]);
  }

  // Cart Methods
  addToCart(part: Part) {
    const current = this.cartState();
    const existing = current.find(item => item.part.id === part.id);

    if (existing) {
      if (existing.quantity < part.stock) {
        this.cartState.set(
          current.map(item => item.part.id === part.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
          )
        );
      }
    } else {
      this.cartState.set([...current, { part, quantity: 1 }]);
    }
  }

  updateCartQuantity(partId: string, change: number) {
    const current = this.cartState();
    this.cartState.set(
      current.map(item => {
        if (item.part.id === partId) {
          const newQty = item.quantity + change;
          if (newQty <= 0) return null;
          if (newQty > item.part.stock) return item; // limit to stock
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter((item): item is CartItem => item !== null)
    );
  }

  removeFromCart(partId: string) {
    this.cartState.update(current => current.filter(item => item.part.id !== partId));
  }

  clearCart() {
    this.cartState.set([]);
  }

  // Labor Service CRUD Methods
  createLaborService(service: Omit<LaborService, 'id'>) {
    const services = this.laborServicesState();
    const nextId = 'L' + String(services.length + 1).padStart(3, '0');
    const newService: LaborService = { ...service, id: nextId };
    this.laborServicesState.update(s => [...s, newService]);
  }

  updateLaborService(serviceId: string, updatedData: Partial<LaborService>) {
    this.laborServicesState.update(services => 
      services.map(s => s.id === serviceId ? { ...s, ...updatedData } : s)
    );
  }

  deleteLaborService(serviceId: string) {
    this.laborServicesState.update(services => services.filter(s => s.id !== serviceId));
  }
}
