import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataStore, Repair, Part, RepairStatus, DeviceType, LaborService, User } from './services/data';

export function emailPatternValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val) return null;
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(val) ? null : { invalidEmailPattern: true };
  };
}

export function phonePatternValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val) return null;
    const digitsOnly = val.replace(/\D/g, '');
    return (digitsOnly.length === 10 || digitsOnly.length === 11) ? null : { invalidPhonePattern: true };
  };
}

export interface PurchaseOrderItem {
  partId: string;
  name: string;
  currentStock: number;
  quantityToOrder: number;
  unitPrice: number;
  supplier: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  // Inject Data Store singleton
  store = inject(DataStore);

  // --- Toast Notifications ---
  toasts = signal<{ id: string; type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }[]>([]);

  showToast(title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const newToast = { id, type, title, message };
    this.toasts.update(current => [...current, newToast]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.toasts.update(current => current.filter(t => t.id !== id));
    }, 5000);
  }

  removeToast(id: string) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  // Active view tab state: 'home' | 'shop' | 'client'
  activeTab = signal<'home' | 'shop' | 'client'>('home');

  // --- Theme Management ---
  currentTheme = signal<'light' | 'dark'>('dark');

  toggleTheme() {
    const next = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.currentTheme.set(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('infotech_theme', next);
      this.applyTheme(next);
    }
  }

  applyTheme(theme: 'light' | 'dark') {
    if (typeof window === 'undefined') return;
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark-theme');
    } else {
      body.classList.remove('dark-theme');
    }
  }

  getTabClass(tab: 'home' | 'shop' | 'client'): string {
    const isActive = this.activeTab() === tab;
    const isDark = this.currentTheme() === 'dark';
    
    if (isActive) {
      if (isDark) {
        return 'bg-emerald-500/10 text-emerald-400 font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-emerald-500/25 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
      } else {
        return 'bg-emerald-500/10 text-emerald-700 font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-emerald-500/30 transition-all duration-300 shadow-xs';
      }
    } else {
      if (isDark) {
        return 'text-zinc-400 hover:text-white hover:bg-white/5 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-transparent transition-all duration-300 cursor-pointer';
      } else {
        return 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-transparent transition-all duration-300 cursor-pointer';
      }
    }
  }

  // --- Search & Track States ---
  trackSearchId = signal<string>('');
  trackedRepair = signal<Repair | null>(null);
  trackError = signal<string>('');

  // --- Store Filters & Search ---
  shopSearch = signal<string>('');
  shopCategory = signal<string>('Todos');
  shopSort = signal<'default' | 'price_asc' | 'price_desc' | 'name'>('default');

  // --- Modals State ---
  activeModal = signal<
    | 'none'
    | 'budget_success'
    | 'testimonial'
    | 'client_create_repair'
    | 'client_edit_repair'
    | 'tech_edit_repair'
    | 'tech_edit_part'
    | 'tech_edit_labor_service'
    | 'print_budget'
    | 'tech_purchase_order'
  >('none');

  // Purchase Order generation state
  purchaseOrders = signal<PurchaseOrderItem[]>([]);

  // Browser Notification state
  notificationPermission = signal<NotificationPermission | 'unsupported'>('default');

  // Admin section sub-tab state: 'dashboard' | 'create_os'
  adminTab = signal<'dashboard' | 'create_os'>('dashboard');
  
  // Admin search text state
  adminSearchText = signal<string>('');
  adminClientSearchQuery = signal<string>('');
  adminClientMode = signal<'select' | 'new'>('select');

  // Current records being edited in modals
  editingRepair = signal<Repair | null>(null);
  printRepair = signal<Repair | null>(null);
  editingPart = signal<Part | null>(null);
  editingLaborService = signal<LaborService | null>(null);
  justCreatedRepair = signal<Repair | null>(null);
  createdCredentials = signal<{ username: string; password?: string; auto: boolean; existing?: boolean } | null>(null);

  // Cart open/close status
  isCartOpen = signal<boolean>(false);

  // Testimonial rating hover/click state
  newTestimonialRating = signal<number>(5);

  // Auth helper UI mode: 'login' | 'register'
  authMode = signal<'login' | 'register'>('login');
  authError = signal<string>('');
  authSuccess = signal<string>('');

  // --- Reactive Forms ---
  loginForm = new FormGroup({
    username: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    password: new FormControl('', { validators: [Validators.required], nonNullable: true })
  });

  registerForm = new FormGroup({
    name: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    email: new FormControl('', { validators: [Validators.required, Validators.email, emailPatternValidator()], nonNullable: true }),
    phone: new FormControl('', { validators: [Validators.required, phonePatternValidator()], nonNullable: true }),
    username: new FormControl('', { validators: [Validators.required, Validators.minLength(4)], nonNullable: true }),
    password: new FormControl('', { validators: [Validators.required, Validators.minLength(4)], nonNullable: true })
  });

  // Budget Calculator Form (Interactive estimate on Home)
  budgetForm = new FormGroup({
    clientName: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    clientEmail: new FormControl('', { validators: [Validators.required, Validators.email, emailPatternValidator()], nonNullable: true }),
    clientPhone: new FormControl('', { validators: [Validators.required, phonePatternValidator()], nonNullable: true }),
    deviceType: new FormControl<DeviceType>('Notebook', { validators: [Validators.required], nonNullable: true }),
    deviceBrandModel: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    description: new FormControl('', { validators: [Validators.required, Validators.minLength(10)], nonNullable: true }),
    urgency: new FormControl<'Baixa' | 'Média' | 'Alta'>('Média', { validators: [Validators.required], nonNullable: true }),
    laborServiceId: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    customCredentials: new FormControl<boolean>(false, { nonNullable: true }),
    username: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true })
  });

  // Client dashboard booking form (similar to budget, but links to auth client)
  clientCreateForm = new FormGroup({
    deviceType: new FormControl<DeviceType>('Notebook', { validators: [Validators.required], nonNullable: true }),
    deviceBrandModel: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    description: new FormControl('', { validators: [Validators.required, Validators.minLength(10)], nonNullable: true }),
    urgency: new FormControl<'Baixa' | 'Média' | 'Alta'>('Média', { validators: [Validators.required], nonNullable: true }),
    laborServiceId: new FormControl('', { validators: [Validators.required], nonNullable: true })
  });

  // Client editing their own request
  clientEditForm = new FormGroup({
    deviceBrandModel: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    description: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    clientPhone: new FormControl('', { validators: [Validators.required, phonePatternValidator()], nonNullable: true })
  });

  // Technician status & notes form
  techRepairForm = new FormGroup({
    status: new FormControl<RepairStatus>('Recebido', { validators: [Validators.required], nonNullable: true }),
    technicianComments: new FormControl('', { nonNullable: true }),
    finalPrice: new FormControl<number>(0, { validators: [Validators.required, Validators.min(0)], nonNullable: true }),
    // Quick helper inputs for appending parts
    newPartName: new FormControl('', { nonNullable: true }),
    newPartPrice: new FormControl<number>(0, { nonNullable: true })
  });

  // Admin New Service Order Form for existing customers
  adminCreateOsForm = new FormGroup({
    clientId: new FormControl('', { nonNullable: true }),
    deviceType: new FormControl<DeviceType>('Notebook', { validators: [Validators.required], nonNullable: true }),
    deviceBrandModel: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    description: new FormControl('', { validators: [Validators.required, Validators.minLength(10)], nonNullable: true }),
    urgency: new FormControl<'Baixa' | 'Média' | 'Alta'>('Média', { validators: [Validators.required], nonNullable: true }),
    laborServiceId: new FormControl('', { nonNullable: true }),
    // New Client fields (used when adminClientMode === 'new')
    newClientName: new FormControl('', { nonNullable: true }),
    newClientEmail: new FormControl('', { nonNullable: true }),
    newClientPhone: new FormControl('', { nonNullable: true }),
    newClientCpf: new FormControl('', { nonNullable: true })
  });

  // Technician labor service CRUD form
  techLaborServiceForm = new FormGroup({
    name: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    price: new FormControl<number>(0, { validators: [Validators.required, Validators.min(0.01)], nonNullable: true }),
    description: new FormControl('', { validators: [Validators.required], nonNullable: true })
  });

  // Technician part inventory CRUD form
  techPartForm = new FormGroup({
    name: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    category: new FormControl<'Notebook' | 'Desktop' | 'Armazenamento' | 'Memória' | 'Processador' | 'Acessórios'>('Notebook', { validators: [Validators.required], nonNullable: true }),
    price: new FormControl<number>(0, { validators: [Validators.required, Validators.min(0.01)], nonNullable: true }),
    stock: new FormControl<number>(1, { validators: [Validators.required, Validators.min(0)], nonNullable: true }),
    imageUrl: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    description: new FormControl('', { validators: [Validators.required], nonNullable: true })
  });

  // Testimonial submission form
  testimonialForm = new FormGroup({
    name: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    comment: new FormControl('', { validators: [Validators.required, Validators.minLength(5)], nonNullable: true })
  });

  // --- Computed States ---
  
  // Real-time estimated budget price based on form values
  liveEstimatedPrice = computed(() => {
    const selectedServiceId = this.budgetForm.value.laborServiceId;
    const foundService = this.store.laborServices().find(s => s.id === selectedServiceId);
    return foundService ? foundService.price : 0;
  });

  // Real-time estimated budget price for client creation modal
  liveClientEstimatedPrice = computed(() => {
    const selectedServiceId = this.clientCreateForm.value.laborServiceId;
    const foundService = this.store.laborServices().find(s => s.id === selectedServiceId);
    return foundService ? foundService.price : 0;
  });

  // Real-time estimated budget price for admin O.S. creation
  liveAdminEstimatedPrice = computed(() => {
    const selectedServiceId = this.adminCreateOsForm.value.laborServiceId;
    const foundService = this.store.laborServices().find(s => s.id === selectedServiceId);
    return foundService ? foundService.price : 0;
  });

  // Registered client users list
  clients = computed(() => {
    return this.store.users().filter(u => u.role === 'client');
  });

  // Filtered clients list matching real-time search on admin create OS screen
  adminSearchMatchedClients = computed(() => {
    const query = this.adminClientSearchQuery().trim().toLowerCase();
    if (!query) return [];
    const clientsList = this.store.users().filter(u => u.role === 'client');
    return clientsList.filter(u => 
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.phone.includes(query) ||
      (u.cpf && u.cpf.toLowerCase().replace(/\D/g, '').includes(query.replace(/\D/g, '')))
    );
  });

  // Admin filtered repairs search list
  filteredRepairs = computed(() => {
    const repairs = this.store.repairs();
    const search = this.adminSearchText().trim().toLowerCase();
    if (!search) return repairs;
    return repairs.filter(r => 
      r.id.toLowerCase().includes(search) ||
      r.clientName.toLowerCase().includes(search) ||
      r.clientPhone.toLowerCase().includes(search) ||
      r.clientEmail.toLowerCase().includes(search) ||
      r.deviceBrandModel.toLowerCase().includes(search) ||
      r.deviceType.toLowerCase().includes(search)
    );
  });

  // Filtered store catalog
  filteredParts = computed(() => {
    let parts = this.store.parts();
    const search = this.shopSearch().toLowerCase().trim();
    const cat = this.shopCategory();
    const sort = this.shopSort();

    // 1. Text Search
    if (search) {
      parts = parts.filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.description.toLowerCase().includes(search)
      );
    }

    // 2. Category Filter
    if (cat !== 'Todos') {
      parts = parts.filter(p => p.category === cat);
    }

    // 3. Sorting
    if (sort === 'price_asc') {
      parts = [...parts].sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      parts = [...parts].sort((a, b) => b.price - a.price);
    } else if (sort === 'name') {
      parts = [...parts].sort((a, b) => a.name.localeCompare(b.name));
    }

    return parts;
  });

  // User-specific repairs (for client history)
  myRepairs = computed(() => {
    const user = this.store.currentUser();
    if (!user || user.role === 'admin') return [];
    return this.store.repairs().filter(r => r.clientId === user.id);
  });

  // Client dashboard analytics
  clientStats = computed(() => {
    const repairs = this.myRepairs();
    const active = repairs.filter(r => r.status !== 'Entregue' && r.status !== 'Pronto para Retirada').length;
    const completed = repairs.filter(r => r.status === 'Entregue' || r.status === 'Pronto para Retirada').length;
    const totalSpent = repairs.filter(r => r.status === 'Entregue').reduce((sum, r) => sum + r.finalPrice, 0);
    return { active, completed, totalSpent };
  });

  // Technician / Admin dashboard stats
  techStats = computed(() => {
    const repairs = this.store.repairs();
    const parts = this.store.parts();

    const pending = repairs.filter(r => r.status !== 'Entregue' && r.status !== 'Pronto para Retirada').length;
    const ready = repairs.filter(r => r.status === 'Pronto para Retirada').length;
    const totalEarnings = repairs
      .filter(r => r.status === 'Entregue' || r.status === 'Pronto para Retirada')
      .reduce((sum, r) => sum + r.finalPrice, 0);

    const lowStockParts = parts.filter(p => p.stock <= 3).length;

    return { pending, ready, totalEarnings, lowStockParts };
  });

  ngOnInit() {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('infotech_theme') as 'light' | 'dark';
      if (savedTheme) {
        this.currentTheme.set(savedTheme);
      } else {
        this.currentTheme.set('dark');
      }
      this.applyTheme(this.currentTheme());

      if ('Notification' in window) {
        this.notificationPermission.set(Notification.permission);
      } else {
        this.notificationPermission.set('unsupported');
      }

      const params = new URLSearchParams(window.location.search);
      const osParam = params.get('os') || params.get('trackingId');
      if (osParam) {
        this.trackSearchId.set(osParam.trim().toUpperCase());
        this.searchRepairTrack();
        this.activeTab.set('home');
        // Clear query param without reloading to keep URL clean
        try {
          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        } catch (e) {
          console.error('Error clearing query params', e);
        }
      } else {
        this.trackSearchId.set('OS-1024');
        this.searchRepairTrack();
      }
    } else {
      this.trackSearchId.set('OS-1024');
      this.searchRepairTrack();
    }
  }

  getQRCodeUrl(repairId: string): string {
    if (typeof window === 'undefined') {
      return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=OS`;
    }
    const trackingUrl = `${window.location.origin}/?os=${repairId}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}`;
  }

  // --- Handlers ---

  // Navigation tab switcher
  switchTab(tab: 'home' | 'shop' | 'client') {
    this.activeTab.set(tab);
    // Smooth scroll to top of page when switching tabs
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Track repair form submit
  searchRepairTrack() {
    const term = this.trackSearchId().trim().toUpperCase();
    if (!term) {
      this.trackError.set('Por favor, digite o número da Ordem de Serviço (ex: OS-1024).');
      this.trackedRepair.set(null);
      return;
    }

    const found = this.store.repairs().find(r => r.id === term);
    if (found) {
      this.trackedRepair.set(found);
      this.trackError.set('');
    } else {
      this.trackError.set('Ordem de serviço não encontrada. Verifique o código e tente novamente.');
      this.trackedRepair.set(null);
    }
  }

  quickTrack(osId: string) {
    this.trackSearchId.set(osId);
    this.searchRepairTrack();
    this.activeTab.set('home');
    // Scroll to tracking section
    setTimeout(() => {
      const el = document.getElementById('tracking-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  getStatusLevel(status: string): number {
    switch (status) {
      case 'Recebido': return 1;
      case 'Em Diagnóstico': return 2;
      case 'Em Reparo': return 3;
      case 'Testes Finais': return 4;
      case 'Pronto para Retirada': return 5;
      case 'Entregue': return 6;
      default: return 1;
    }
  }

  // Submit budget request on main page
  submitBudgetForm() {
    if (this.budgetForm.invalid) {
      this.budgetForm.markAllAsTouched();
      return;
    }

    const formVal = this.budgetForm.getRawValue();
    const foundService = this.store.laborServices().find(s => s.id === formVal.laborServiceId);
    const servicePrefix = foundService ? `[Serviço: ${foundService.name}] ` : '';

    // Check if user is logged in as client (guests or admin logged in will create a new client account)
    const isClientLogged = this.store.currentUser()?.role === 'client';
    let finalUsername = '';
    let finalPassword = '';
    let createdClientId = '';

    if (!isClientLogged) {
      // Check if this email is already registered to a client
      const existingUser = this.store.users().find(
        u => u.email.toLowerCase() === formVal.clientEmail.trim().toLowerCase() && u.role === 'client'
      );

      if (existingUser) {
        // Since they already exist, we just link this O.S. to their account!
        createdClientId = existingUser.id;
        
        // Save createdCredentials with 'existing: true'
        this.createdCredentials.set({
          username: existingUser.username,
          auto: false,
          existing: true
        });
      } else {
        if (formVal.customCredentials) {
          const uName = formVal.username.trim();
          const uPass = formVal.password.trim();

          let hasError = false;
          if (!uName || uName.length < 4) {
            this.budgetForm.get('username')?.setErrors({ minlength: true });
            this.budgetForm.get('username')?.markAsTouched();
            hasError = true;
          }
          if (!uPass || uPass.length < 4) {
            this.budgetForm.get('password')?.setErrors({ minlength: true });
            this.budgetForm.get('password')?.markAsTouched();
            hasError = true;
          }

          if (hasError) return;

          // Check username taken
          const usernameTaken = this.store.users().some(u => u.username.toLowerCase() === uName.toLowerCase());
          if (usernameTaken) {
            this.budgetForm.get('username')?.setErrors({ taken: true });
            this.budgetForm.get('username')?.markAsTouched();
            return;
          }

          finalUsername = uName;
          finalPassword = uPass;
        } else {
          // Generate automatically
          const email = formVal.clientEmail.trim().toLowerCase();
          const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
          let autoUsername = emailPrefix;
          if (autoUsername.length < 4) {
            autoUsername = (formVal.clientName.trim().split(' ')[0].toLowerCase().replace(/[^a-zA-Z0-9]/g, '') + '123').slice(0, 10);
          }
          // Ensure unique autoUsername
          let isUnique = false;
          let suffix = '';
          let attempts = 0;
          while (!isUnique && attempts < 20) {
            const checkName = autoUsername + suffix;
            if (!this.store.users().some(u => u.username.toLowerCase() === checkName.toLowerCase())) {
              autoUsername = checkName;
              isUnique = true;
            } else {
              suffix = Math.floor(Math.random() * 900 + 100).toString();
            }
            attempts++;
          }
          finalUsername = autoUsername;
          finalPassword = Math.floor(Math.random() * 900000 + 100000).toString(); // 6 digits
        }

        // Check if admin is currently logged in, so we don't permanently switch session to the new client
        const isAdminLogged = this.store.currentUser()?.role === 'admin';

        // Register the client account
        const reg = this.store.register(formVal.clientName, formVal.clientEmail, formVal.clientPhone, finalUsername, finalPassword);
        if (reg.success) {
          this.createdCredentials.set({
            username: finalUsername,
            password: finalPassword,
            auto: !formVal.customCredentials,
            existing: false
          });

          // Find the registered user to get their ID
          const newlyCreatedUser = this.store.users().find(u => u.username.toLowerCase() === finalUsername.toLowerCase());
          createdClientId = newlyCreatedUser ? newlyCreatedUser.id : 'U-GUEST';

          // If admin was logged in, restore admin session
          if (isAdminLogged) {
            const adminUser = this.store.users().find(u => u.role === 'admin');
            if (adminUser) {
              this.store.login(adminUser.username, adminUser.password || '');
            }
          }
        } else {
          alert('Erro ao criar conta de cliente: ' + reg.error);
          return;
        }
      }
    } else {
      this.createdCredentials.set(null);
      createdClientId = this.store.currentUser()?.id || 'U-GUEST';
    }
    
    // Create repair request (linked to the correct client ID)
    const newRepair = this.store.createRepairRequest({
      clientId: createdClientId,
      clientName: formVal.clientName,
      clientEmail: formVal.clientEmail,
      clientPhone: formVal.clientPhone,
      deviceType: formVal.deviceType,
      deviceBrandModel: formVal.deviceBrandModel,
      description: servicePrefix + formVal.description,
      urgency: formVal.urgency,
      estimatedPrice: this.liveEstimatedPrice()
    });

    this.justCreatedRepair.set(newRepair);
    this.activeModal.set('budget_success');
    
    // Trigger toast notification
    this.showToast(
      'Ordem de Serviço Criada!',
      `O.S. #${newRepair.id} (${newRepair.deviceType}) foi aberta para ${newRepair.clientName}.`,
      newRepair.urgency === 'Alta' ? 'warning' : 'success'
    );

    this.budgetForm.reset({
      deviceType: 'Notebook',
      urgency: 'Média',
      laborServiceId: '',
      customCredentials: false,
      username: '',
      password: ''
    });
  }

  // Pre-fill user data into budget form if logged in
  prefillBudgetForm() {
    const user = this.store.currentUser();
    if (user) {
      this.budgetForm.patchValue({
        clientName: user.name,
        clientEmail: user.email,
        clientPhone: user.phone
      });
    }
  }

  // WhatsApp Message Generator
  openWhatsAppContact(repair: Repair) {
    const message = `Olá, gostaria de confirmar meu agendamento na InfoTech!%0A` +
      `*Ordem de Serviço:* ${repair.id}%0A` +
      `*Aparelho:* ${repair.deviceType} - ${repair.deviceBrandModel}%0A` +
      `*Defeito:* ${repair.description}%0A` +
      `*Urgência:* ${repair.urgency}%0A` +
      `*Orçamento Estimado:* R$ ${repair.estimatedPrice.toFixed(2)}`;
    
    const whatsappUrl = `https://api.whatsapp.com/send?phone=55${repair.clientPhone.replace(/\D/g, '')}&text=${message}`;
    window.open(whatsappUrl, '_blank');
  }

  openGeneralWhatsApp() {
    const message = `Olá InfoTech, gostaria de tirar uma dúvida sobre suporte/peças de informática!`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=5511988887777&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  openCartWhatsAppCheckout() {
    if (this.store.cart().length === 0) return;

    let itemsString = '';
    this.store.cart().forEach((item, index) => {
      itemsString += `${index + 1}. *${item.part.name}* (Qtd: ${item.quantity}) - R$ ${(item.part.price * item.quantity).toFixed(2)}%0A`;
    });

    const user = this.store.currentUser();
    const userString = user 
      ? `*Cliente:* ${user.name} (${user.phone})%0A` 
      : `*Cliente:* Novo Cliente (Desejo preencher cadastro)%0A`;

    const message = `Olá, gostaria de comprar as seguintes peças na InfoTech!%0A%0A` +
      `${userString}` +
      `*Itens do Carrinho:*%0A${itemsString}%0A` +
      `*Total:* R$ ${this.store.cartTotal().toFixed(2)}%0A%0A` +
      `Por favor, confirme a disponibilidade para entrega ou retirada!`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=5511988887777&text=${message}`;
    window.open(whatsappUrl, '_blank');
    this.store.clearCart();
    this.isCartOpen.set(false);
  }

  // --- Auth Handlers ---
  handleLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { username, password } = this.loginForm.getRawValue();
    const res = this.store.login(username, password);

    if (res.success) {
      this.authError.set('');
      this.authSuccess.set('Login realizado com sucesso!');
      this.loginForm.reset();
      
      // Auto pre-fill budget form
      this.prefillBudgetForm();

      setTimeout(() => {
        this.authSuccess.set('');
      }, 3000);
    } else {
      this.authError.set(res.error || 'Erro ao fazer login.');
    }
  }

  handleRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const val = this.registerForm.getRawValue();
    const res = this.store.register(val.name, val.email, val.phone, val.username, val.password);

    if (res.success) {
      this.authError.set('');
      this.authSuccess.set('Cadastro realizado com sucesso! Bem-vindo.');
      this.registerForm.reset();

      setTimeout(() => {
        this.authSuccess.set('');
      }, 3000);
    } else {
      this.authError.set(res.error || 'Erro ao realizar cadastro.');
    }
  }

  handleLogout() {
    this.store.logout();
    this.authSuccess.set('Desconectado com sucesso.');
    setTimeout(() => {
      this.authSuccess.set('');
    }, 3000);
  }

  // --- Client CRUD Actions (My Dashboard) ---
  openClientCreateModal() {
    this.clientCreateForm.reset({
      deviceType: 'Notebook',
      urgency: 'Média',
      laborServiceId: ''
    });
    this.activeModal.set('client_create_repair');
  }

  submitClientCreateRepair() {
    if (this.clientCreateForm.invalid) {
      this.clientCreateForm.markAllAsTouched();
      return;
    }

    const user = this.store.currentUser();
    if (!user) return;

    const val = this.clientCreateForm.getRawValue();
    const foundService = this.store.laborServices().find(s => s.id === val.laborServiceId);
    const servicePrefix = foundService ? `[Serviço: ${foundService.name}] ` : '';

    const newRepair = this.store.createRepairRequest({
      clientId: user.id,
      clientName: user.name,
      clientEmail: user.email,
      clientPhone: user.phone,
      deviceType: val.deviceType,
      deviceBrandModel: val.deviceBrandModel,
      description: servicePrefix + val.description,
      urgency: val.urgency,
      estimatedPrice: this.liveClientEstimatedPrice()
    });

    // Trigger toast notification
    this.showToast(
      'Nova Ordem de Serviço!',
      `Sua O.S. #${newRepair.id} para ${newRepair.deviceType} foi registrada com sucesso.`,
      newRepair.urgency === 'Alta' ? 'warning' : 'success'
    );

    this.activeModal.set('none');
  }

  openClientEditModal(repair: Repair) {
    this.editingRepair.set(repair);
    this.clientEditForm.reset({
      deviceBrandModel: repair.deviceBrandModel,
      description: repair.description,
      clientPhone: repair.clientPhone
    });
    this.activeModal.set('client_edit_repair');
  }

  submitClientEditRepair() {
    const target = this.editingRepair();
    if (!target) return;

    if (this.clientEditForm.invalid) {
      this.clientEditForm.markAllAsTouched();
      return;
    }

    const val = this.clientEditForm.getRawValue();
    this.store.updateRepair(target.id, {
      deviceBrandModel: val.deviceBrandModel,
      description: val.description,
      clientPhone: val.clientPhone
    });

    this.activeModal.set('none');
    this.editingRepair.set(null);
  }

  deleteClientRepair(osId: string) {
    if (confirm(`Tem certeza que deseja cancelar a solicitação ${osId}? Esta ação não pode ser desfeita.`)) {
      this.store.deleteRepair(osId);
      if (this.trackedRepair()?.id === osId) {
        this.trackedRepair.set(null);
      }
    }
  }

  openPrintBudgetModal(repair: Repair) {
    this.printRepair.set(repair);
    this.activeModal.set('print_budget');
  }

  triggerPrint() {
    window.print();
  }

  // --- Technician Dashboard CRUD Actions ---
  openTechEditModal(repair: Repair) {
    this.editingRepair.set(repair);
    this.techRepairForm.reset({
      status: repair.status,
      technicianComments: repair.technicianComments,
      finalPrice: repair.finalPrice,
      newPartName: '',
      newPartPrice: 0
    });
    this.activeModal.set('tech_edit_repair');
  }

  addPartToEditingRepair() {
    const repair = this.editingRepair();
    if (!repair) return;

    const partName = this.techRepairForm.value.newPartName?.trim();
    const partPrice = this.techRepairForm.value.newPartPrice || 0;

    if (!partName) {
      alert('Digite o nome da peça para adicionar.');
      return;
    }

    const currentParts = [...repair.partsUsed, { name: partName, price: partPrice }];
    const currentFinalPrice = this.techRepairForm.value.finalPrice || 0;
    
    // Auto-update price field in the form as helper
    const updatedFinalPrice = currentFinalPrice + partPrice;

    // Mutate the editing repair representation
    this.editingRepair.set({
      ...repair,
      partsUsed: currentParts,
      finalPrice: updatedFinalPrice
    });

    this.techRepairForm.patchValue({
      finalPrice: updatedFinalPrice,
      newPartName: '',
      newPartPrice: 0
    });
  }

  removePartFromEditingRepair(index: number) {
    const repair = this.editingRepair();
    if (!repair) return;

    const removedPrice = repair.partsUsed[index].price;
    const updatedParts = repair.partsUsed.filter((_, i) => i !== index);
    const currentFinalPrice = this.techRepairForm.value.finalPrice || 0;
    const updatedFinalPrice = Math.max(0, currentFinalPrice - removedPrice);

    this.editingRepair.set({
      ...repair,
      partsUsed: updatedParts,
      finalPrice: updatedFinalPrice
    });

    this.techRepairForm.patchValue({
      finalPrice: updatedFinalPrice
    });
  }

  submitTechEditRepair() {
    const target = this.editingRepair();
    if (!target) return;

    if (this.techRepairForm.invalid) {
      this.techRepairForm.markAllAsTouched();
      return;
    }

    const val = this.techRepairForm.getRawValue();
    const oldStatus = target.status;
    const newStatus = val.status;

    this.store.updateRepair(target.id, {
      status: val.status,
      technicianComments: val.technicianComments,
      finalPrice: val.finalPrice,
      partsUsed: target.partsUsed,
      photosBefore: target.photosBefore || [],
      photosAfter: target.photosAfter || []
    });

    // Send Browser Notification to Client if status changed to 'Pronto para Retirada' or 'Entregue'
    if (newStatus !== oldStatus && (newStatus === 'Pronto para Retirada' || newStatus === 'Entregue')) {
      const deviceName = target.deviceBrandModel || target.deviceType || 'Aparelho';
      const statusLabel = newStatus === 'Pronto para Retirada' ? 'Pronto para Retirada' : 'Entregue';
      const body = `O status do seu aparelho "${deviceName}" (O.S. ${target.id}) foi alterado para: ${statusLabel}.`;
      
      this.sendBrowserNotification(`Atualização da O.S. ${target.id}`, body);
    }

    // If active tracked repair is being edited, sync the tracking card too!
    if (this.trackedRepair()?.id === target.id) {
      const freshData = this.store.repairs().find(r => r.id === target.id);
      if (freshData) this.trackedRepair.set(freshData);
    }

    this.activeModal.set('none');
    this.editingRepair.set(null);
  }

  // --- Technician Parts CRUD Actions ---
  openTechPartModal(part: Part | null) {
    if (part) {
      this.editingPart.set(part);
      this.techPartForm.reset({
        name: part.name,
        category: part.category,
        price: part.price,
        stock: part.stock,
        imageUrl: part.imageUrl,
        description: part.description
      });
    } else {
      this.editingPart.set(null);
      this.techPartForm.reset({
        name: '',
        category: 'Notebook',
        price: 0,
        stock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80',
        description: ''
      });
    }
    this.activeModal.set('tech_edit_part');
  }

  submitTechPartForm() {
    if (this.techPartForm.invalid) {
      this.techPartForm.markAllAsTouched();
      return;
    }

    const val = this.techPartForm.getRawValue();
    const target = this.editingPart();

    if (target) {
      // Update
      this.store.updatePart(target.id, val);
    } else {
      // Create
      this.store.createPart(val);
    }

    this.activeModal.set('none');
    this.editingPart.set(null);
  }

  deletePart(partId: string) {
    if (confirm('Tem certeza que deseja excluir esta peça da loja?')) {
      this.store.deletePart(partId);
    }
  }

  // --- Purchase Orders for Low Stock Parts ---
  criticallyLowParts = computed(() => {
    return this.store.parts().filter(p => p.stock < 2);
  });

  openPurchaseOrderModal() {
    const lowParts = this.criticallyLowParts();
    if (lowParts.length === 0) {
      this.showToast('Sem Alertas', 'Não há peças com estoque criticamente baixo (menos de 2 itens).', 'info');
      return;
    }

    const initialPOs = lowParts.map(p => ({
      partId: p.id,
      name: p.name,
      currentStock: p.stock,
      quantityToOrder: 10 - p.stock, // Suggest ordering up to 10 units
      unitPrice: p.price,
      supplier: this.getRandomSupplierForPart(p.category)
    }));

    this.purchaseOrders.set(initialPOs);
    this.activeModal.set('tech_purchase_order');
  }

  getRandomSupplierForPart(category: string): string {
    const suppliers: Record<string, string[]> = {
      'Notebook': ['SND Distribuição', 'Allied Brasil', 'Dell Componentes', 'Acer Tech Parts'],
      'Desktop': ['KabuM! Atacado', 'Pichau Distribuição', 'Gigabyte Atacado', 'Asus Tech'],
      'Armazenamento': ['Kingston Oficial', 'Crucial Brasil', 'Sandisk Logística', 'Seagate Atacado'],
      'Memória': ['Corsair Distribuidora', 'Kingston Oficial', 'G.Skill Import', 'Adata Tech'],
      'Processador': ['Intel Distribuição Brasil', 'AMD Atacado Sul', 'SND Distribuição'],
      'Acessórios': ['Logitech Atacado', 'Multilaser Corp', 'Razer Brasil', 'Importadora Express']
    };
    const list = suppliers[category] || ['Distribuidor de Peças Geral', 'Importadora Nacional S.A.'];
    return list[Math.floor(Math.random() * list.length)];
  }

  updatePOQuantity(partId: string, quantity: number) {
    const qty = Math.max(1, Math.floor(quantity));
    this.purchaseOrders.update(orders => 
      orders.map(o => o.partId === partId ? { ...o, quantityToOrder: qty } : o)
    );
  }

  updatePOSupplier(partId: string, supplier: string) {
    this.purchaseOrders.update(orders => 
      orders.map(o => o.partId === partId ? { ...o, supplier: supplier } : o)
    );
  }

  submitPurchaseOrders() {
    const orders = this.purchaseOrders();
    if (orders.length === 0) return;

    // Simulate ordering and replenishing the stock in the store
    orders.forEach(item => {
      const part = this.store.parts().find(p => p.id === item.partId);
      if (part) {
        const newStock = part.stock + item.quantityToOrder;
        this.store.updatePart(item.partId, { stock: newStock });
      }
    });

    const totalItems = orders.reduce((sum, o) => sum + o.quantityToOrder, 0);
    const totalCost = orders.reduce((sum, o) => sum + (o.quantityToOrder * o.unitPrice), 0);

    this.showToast(
      'Pedidos Gerados!',
      `Foram encomendados ${totalItems} itens de ${orders.length} produtos diferentes. Custo total estimado: ${this.formatCurrency(totalCost)}.`,
      'success'
    );

    this.activeModal.set('none');
    this.purchaseOrders.set([]);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  getPOTotalCost(): number {
    return this.purchaseOrders().reduce((sum, o) => sum + (o.quantityToOrder * o.unitPrice), 0);
  }

  requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      this.showToast('Não Suportado', 'Notificações do navegador não são suportadas neste dispositivo.', 'info');
      return;
    }

    Notification.requestPermission().then(permission => {
      this.notificationPermission.set(permission);
      if (permission === 'granted') {
        this.showToast('Permissão Concedida!', 'Você receberá notificações quando o status da sua O.S. for alterado.', 'success');
        try {
          new Notification('InfoTech Reparos', {
            body: 'As notificações do navegador foram ativadas com sucesso! Você será avisado por aqui.',
            icon: '/favicon.ico'
          });
        } catch (e) {
          console.error('Error sending test notification', e);
        }
      } else if (permission === 'denied') {
        this.showToast('Permissão Negada', 'Para receber alertas, você precisa liberar as notificações nas configurações do seu navegador.', 'warning');
      }
    }).catch(err => {
      console.error('Notification permission error', err);
    });
  }

  sendBrowserNotification(title: string, body: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'os-status-change-' + Date.now()
        });
      } catch (e) {
        console.error('Error sending browser notification', e);
      }
    }
  }

  sendTestNotification() {
    this.sendBrowserNotification(
      'Teste de Notificação - InfoTech',
      'Isso é um teste para garantir que você receberá alertas quando o status da sua O.S. mudar para "Pronto para Retirada" ou "Entregue"!'
    );
  }

  selectAdminClient(client: User) {
    this.adminCreateOsForm.patchValue({ clientId: client.id });
    this.adminClientSearchQuery.set('');
  }

  checkAndAutoRecoverClient() {
    if (this.adminClientMode() !== 'new') return;
    
    const email = this.adminCreateOsForm.value.newClientEmail?.trim().toLowerCase();
    const cpf = this.adminCreateOsForm.value.newClientCpf?.trim().replace(/\D/g, '');

    if (!email && !cpf) return;

    const matchedUser = this.store.users().find(u => {
      if (u.role !== 'client') return false;
      const userCpfClean = u.cpf ? u.cpf.replace(/\D/g, '') : '';
      return (email && u.email.toLowerCase() === email) || (cpf && userCpfClean === cpf);
    });

    if (matchedUser) {
      this.adminCreateOsForm.patchValue({
        clientId: matchedUser.id,
        newClientName: '',
        newClientEmail: '',
        newClientPhone: '',
        newClientCpf: ''
      });
      this.adminClientMode.set('select');
      this.adminClientSearchQuery.set('');
      this.showToast(
        'Cliente Localizado!',
        `Os dados de "${matchedUser.name}" foram carregados automaticamente para evitar duplicidade de cadastro.`,
        'success'
      );
    }
  }

  formatCpfValue(value: string): string {
    if (!value) return '';
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 11) {
      numbers = numbers.slice(0, 11);
    }
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    } else if (numbers.length <= 9) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    } else {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
    }
  }

  onCpfInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatCpfValue(input.value);
    this.adminCreateOsForm.get('newClientCpf')?.setValue(formatted, { emitEvent: false });
    input.value = formatted;
    this.checkAndAutoRecoverClient();
  }

  onAdminNewClientPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatPhoneValue(input.value);
    this.adminCreateOsForm.get('newClientPhone')?.setValue(formatted, { emitEvent: false });
    input.value = formatted;
  }

  submitAdminCreateOs() {
    // Basic validations on device and description fields
    if (this.adminCreateOsForm.get('deviceBrandModel')?.invalid || 
        this.adminCreateOsForm.get('description')?.invalid ||
        this.adminCreateOsForm.get('urgency')?.invalid) {
      this.adminCreateOsForm.get('deviceBrandModel')?.markAsTouched();
      this.adminCreateOsForm.get('description')?.markAsTouched();
      this.adminCreateOsForm.get('urgency')?.markAsTouched();
      this.showToast('Campos Inválidos', 'Por favor, preencha todos os dados do dispositivo e descrição.', 'warning');
      return;
    }

    const val = this.adminCreateOsForm.getRawValue();
    let finalClientId = '';
    let finalClientName = '';
    let finalClientEmail = '';
    let finalClientPhone = '';

    if (this.adminClientMode() === 'select') {
      if (!val.clientId) {
        this.showToast('Selecione o Cliente', 'Por favor, selecione um cliente cadastrado ou escolha a opção de cadastro em tempo real.', 'warning');
        return;
      }
      const foundClient = this.store.users().find(u => u.id === val.clientId);
      if (!foundClient) {
        this.showToast('Cliente Não Encontrado', 'O cliente selecionado não foi encontrado no sistema.', 'error');
        return;
      }
      finalClientId = foundClient.id;
      finalClientName = foundClient.name;
      finalClientEmail = foundClient.email;
      finalClientPhone = foundClient.phone;
    } else {
      // New Client Mode
      const nameVal = val.newClientName?.trim();
      const emailVal = val.newClientEmail?.trim();
      const phoneVal = val.newClientPhone?.trim();
      const cpfVal = val.newClientCpf?.trim();

      if (!nameVal || nameVal.length < 3) {
        this.showToast('Nome Inválido', 'O nome do cliente deve ter pelo menos 3 caracteres.', 'warning');
        return;
      }
      if (!emailVal || !emailVal.includes('@')) {
        this.showToast('E-mail Inválido', 'Por favor, informe um endereço de e-mail válido.', 'warning');
        return;
      }
      if (!phoneVal || phoneVal.length < 10) {
        this.showToast('Telefone Inválido', 'Por favor, informe um telefone válido com DDD.', 'warning');
        return;
      }

      // Check unique email or CPF
      const emailTaken = this.store.users().some(u => u.email.toLowerCase() === emailVal.toLowerCase());
      if (emailTaken) {
        this.showToast('E-mail Duplicado', 'Este e-mail já está cadastrado para outro cliente.', 'error');
        return;
      }

      if (cpfVal) {
        const cleanCpf = cpfVal.replace(/\D/g, '');
        const cpfTaken = this.store.users().some(u => u.cpf && u.cpf.replace(/\D/g, '') === cleanCpf);
        if (cpfTaken) {
          this.showToast('CPF Duplicado', 'Este CPF já está cadastrado para outro cliente.', 'error');
          return;
        }
      }

      // Generate credentials
      const emailPrefix = emailVal.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      let autoUsername = emailPrefix;
      if (autoUsername.length < 4) {
        autoUsername = (nameVal.split(' ')[0].toLowerCase().replace(/[^a-zA-Z0-9]/g, '') + '123').slice(0, 10);
      }
      
      let isUnique = false;
      let suffix = '';
      let attempts = 0;
      while (!isUnique && attempts < 20) {
        const checkName = autoUsername + suffix;
        if (!this.store.users().some(u => u.username.toLowerCase() === checkName.toLowerCase())) {
          autoUsername = checkName;
          isUnique = true;
        } else {
          suffix = Math.floor(Math.random() * 900 + 100).toString();
        }
        attempts++;
      }
      const finalUsername = autoUsername;
      const finalPassword = Math.floor(Math.random() * 900000 + 100000).toString(); // 6 digits

      // Save current user to restore session if they are admin
      const currentLoggedIn = this.store.currentUser();
      const isAdminLogged = currentLoggedIn?.role === 'admin';

      // Register
      const reg = this.store.register(nameVal, emailVal, phoneVal, finalUsername, finalPassword, cpfVal);
      if (!reg.success) {
        this.showToast('Erro ao Cadastrar', reg.error || 'Erro desconhecido', 'error');
        return;
      }

      // If admin was logged in, restore admin session because register logs in the new user automatically
      if (isAdminLogged && currentLoggedIn) {
        const adminUser = this.store.users().find(u => u.id === currentLoggedIn.id);
        if (adminUser) {
          this.store.login(adminUser.username, adminUser.password || '');
        }
      }

      const newlyCreatedUser = this.store.users().find(u => u.username.toLowerCase() === finalUsername.toLowerCase());
      if (!newlyCreatedUser) {
        this.showToast('Erro', 'Não foi possível recuperar o cliente cadastrado.', 'error');
        return;
      }

      finalClientId = newlyCreatedUser.id;
      finalClientName = newlyCreatedUser.name;
      finalClientEmail = newlyCreatedUser.email;
      finalClientPhone = newlyCreatedUser.phone;

      // Save credentials to display to technician so they can share it with client
      this.createdCredentials.set({
        username: finalUsername,
        password: finalPassword,
        auto: true,
        existing: false
      });
    }

    const foundService = this.store.laborServices().find(s => s.id === val.laborServiceId);
    const servicePrefix = foundService ? `[Serviço: ${foundService.name}] ` : '';

    const newRepair = this.store.createRepairRequest({
      clientId: finalClientId,
      clientName: finalClientName,
      clientEmail: finalClientEmail,
      clientPhone: finalClientPhone,
      deviceType: val.deviceType,
      deviceBrandModel: val.deviceBrandModel,
      description: servicePrefix + val.description,
      urgency: val.urgency,
      estimatedPrice: this.liveAdminEstimatedPrice()
    });

    this.showToast(
      'O.S. Criada com Sucesso!',
      `Ordem de Serviço #${newRepair.id} foi aberta para o cliente "${finalClientName}"!`,
      'success'
    );

    // Send a browser notification if possible
    this.sendBrowserNotification(
      `Nova O.S. Gerada: ${newRepair.id}`,
      `Uma nova ordem de serviço para seu ${newRepair.deviceType} foi aberta.`
    );

    // Reset the form and switch back to dashboard
    this.adminCreateOsForm.reset({
      clientId: '',
      deviceType: 'Notebook',
      deviceBrandModel: '',
      description: '',
      urgency: 'Média',
      laborServiceId: '',
      newClientName: '',
      newClientEmail: '',
      newClientPhone: '',
      newClientCpf: ''
    });
    this.adminClientSearchQuery.set('');
    this.adminClientMode.set('select');
    this.adminTab.set('dashboard');
  }

  getSelectedClient(clientId: string | null | undefined): User | undefined {
    if (!clientId) return undefined;
    return this.store.users().find(u => u.id === clientId);
  }

  isEmailRegistered(): boolean {
    if (this.store.currentUser()?.role === 'client') return false;
    const email = this.budgetForm.get('clientEmail')?.value?.trim().toLowerCase();
    if (!email) return false;
    return this.store.users().some(u => u.email.toLowerCase() === email && u.role === 'client');
  }

  formatPhoneValue(value: string): string {
    if (!value) return '';
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 11) {
      numbers = numbers.slice(0, 11);
    }
    if (numbers.length <= 2) {
      return numbers.length > 0 ? `(${numbers}` : '';
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
  }

  onPhoneInput(event: Event, formName: 'register' | 'budget' | 'edit') {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatPhoneValue(input.value);
    
    if (formName === 'register') {
      this.registerForm.get('phone')?.setValue(formatted, { emitEvent: false });
    } else if (formName === 'budget') {
      this.budgetForm.get('clientPhone')?.setValue(formatted, { emitEvent: false });
    } else if (formName === 'edit') {
      this.clientEditForm.get('clientPhone')?.setValue(formatted, { emitEvent: false });
    }
    
    input.value = formatted;
  }

  // --- Labor Services Admin CRUD Methods ---
  openTechLaborServiceModal(service: LaborService | null) {
    this.editingLaborService.set(service);
    if (service) {
      this.techLaborServiceForm.reset({
        name: service.name,
        price: service.price,
        description: service.description
      });
    } else {
      this.techLaborServiceForm.reset({
        name: '',
        price: 0,
        description: ''
      });
    }
    this.activeModal.set('tech_edit_labor_service');
  }

  submitTechLaborServiceForm() {
    if (this.techLaborServiceForm.invalid) {
      this.techLaborServiceForm.markAllAsTouched();
      return;
    }

    const val = this.techLaborServiceForm.getRawValue();
    const target = this.editingLaborService();

    if (target) {
      this.store.updateLaborService(target.id, val);
    } else {
      this.store.createLaborService(val);
    }

    this.activeModal.set('none');
    this.editingLaborService.set(null);
  }

  deleteLaborService(serviceId: string) {
    if (confirm('Tem certeza que deseja excluir este serviço de mão de obra pré-determinado?')) {
      this.store.deleteLaborService(serviceId);
    }
  }

  // --- Testimonial Actions ---
  openTestimonialModal() {
    this.testimonialForm.reset({
      name: this.store.currentUser()?.name || '',
      comment: ''
    });
    this.newTestimonialRating.set(5);
    this.activeModal.set('testimonial');
  }

  setRating(rating: number) {
    this.newTestimonialRating.set(rating);
  }

  submitTestimonial() {
    if (this.testimonialForm.invalid) {
      this.testimonialForm.markAllAsTouched();
      return;
    }

    const { name, comment } = this.testimonialForm.getRawValue();
    this.store.addTestimonial(name, this.newTestimonialRating(), comment);
    this.activeModal.set('none');
  }

  // --- Photo Gallery Methods ---
  selectedGalleryPhoto = signal<string | null>(null);

  onPhotoUploaded(event: Event, type: 'before' | 'after') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          if (base64) {
            this.addPhotoToEditingRepair(base64, type);
          }
        };
        reader.readAsDataURL(file);
      });
      input.value = '';
    }
  }

  onPhotoDropped(event: DragEvent, type: 'before' | 'after') {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const files = Array.from(event.dataTransfer.files);
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            if (base64) {
              this.addPhotoToEditingRepair(base64, type);
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  addPhotoUrl(urlInput: HTMLInputElement, type: 'before' | 'after') {
    const url = urlInput.value.trim();
    if (url) {
      this.addPhotoToEditingRepair(url, type);
      urlInput.value = '';
    }
  }

  addPhotoToEditingRepair(photoUrl: string, type: 'before' | 'after') {
    const repair = this.editingRepair();
    if (!repair) return;

    if (type === 'before') {
      const photos = repair.photosBefore ? [...repair.photosBefore] : [];
      photos.push(photoUrl);
      this.editingRepair.set({
        ...repair,
        photosBefore: photos
      });
    } else {
      const photos = repair.photosAfter ? [...repair.photosAfter] : [];
      photos.push(photoUrl);
      this.editingRepair.set({
        ...repair,
        photosAfter: photos
      });
    }
  }

  removePhotoFromEditingRepair(index: number, type: 'before' | 'after') {
    const repair = this.editingRepair();
    if (!repair) return;

    if (type === 'before') {
      const photos = (repair.photosBefore || []).filter((_, i) => i !== index);
      this.editingRepair.set({
        ...repair,
        photosBefore: photos
      });
    } else {
      const photos = (repair.photosAfter || []).filter((_, i) => i !== index);
      this.editingRepair.set({
        ...repair,
        photosAfter: photos
      });
    }
  }
}
