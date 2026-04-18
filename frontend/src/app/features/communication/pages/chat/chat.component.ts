import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { ChatService } from '../../services/chat.service';
import { Message, Conversation, Call } from '../../models/messages.model';
import { Subscription } from 'rxjs';

interface ChatMessage extends Message {
  translatedContent?: string | null;
}

interface ChatConversation extends Conversation {
  interlocutorName?: string;
  interlocutorAvatar?: string;
  messages: ChatMessage[];
  status?: string;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  conversations: ChatConversation[] = [];
  selectedConversation: ChatConversation | null = null;
  allPlatformUsers: User[] = [];

  messageText: string = '';
  searchQuery: string = '';
  editingMessageId: number | null = null;
  editContent: string = '';
  activeMenuId: number | null = null;

  searchResults: any[] = [];
  isGlobalSearching: boolean = false;

  readonly MAX_MESSAGE_CHARS = 50;

  showConfirmModal: boolean = false;
  modalTitle: string = '';
  modalMessage: string = '';
  modalType: 'DELETE_CONV' | 'ARCHIVE_CONV' | 'DELETE_MSG' | null = null;
  pendingId: number | null = null;
  pendingConv: ChatConversation | null = null;

  targetLang: string = 'en';

  currentCall: Call | null = null;
  isCallModalOpen: boolean = false;
  incomingCall: Call | null = null;

  showEmojiPicker: boolean = false;
  emojiList: string[] = ['😊', '😂', '🥰', '😍', '😒', '😭', '😎', '🙏', '👍', '🔥', '✨', '❤️', '🩺', '💊', '🏥', '🚑', '💉', '🩹', '🩸', '👨‍⚕️', '👩‍⚕️', '🆘', '⚠️'];
  badWords: string[] = [];

  private messageSubscription: Subscription | null = null;
  private callSubscription: Subscription | null = null;

  constructor(private authService: AuthService, public chatService: ChatService) { }

  ngOnInit(): void {
    this.loadForbiddenWords();
    this.authService.currentUser$.subscribe((user: User | null) => {
      this.currentUser = user;
      if (user && user.email) {
        this.loadConversations(user.email);
        this.loadUsersFromPlatform();
      }
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeAll();
  }

  private unsubscribeAll(): void {
    this.messageSubscription?.unsubscribe();
    this.callSubscription?.unsubscribe();
  }

  // --- Recherche globale ---
  onSearchInput(query: string) {
    if (!query || query.trim().length < 3) {
      this.isGlobalSearching = false;
      this.searchResults = [];
      return;
    }
    this.isGlobalSearching = true;
    const userEmail = this.currentUser?.email;
    if (userEmail) {
      this.chatService.searchGlobalMessages(userEmail, query).subscribe({
        next: (results) => this.searchResults = results,
        error: (err) => console.error('Erreur recherche globale:', err)
      });
    }
  }

  selectConversationFromSearch(msg: any) {
    const conversationId = Number(msg.conversationId || msg.idConversation || (msg.conversation ? msg.conversation.id : null));
    if (!conversationId) {
      console.error("ID manquant dans l'objet :", msg);
      return;
    }
    const targetConv = this.conversations.find(c => Number(c.id) === conversationId);
    if (targetConv) {
      this.selectConversation(targetConv);
      this.isGlobalSearching = false;
      this.searchQuery = '';
    } else {
      if (this.currentUser?.email) {
        this.chatService.getConversations(this.currentUser.email).subscribe(convs => {
          this.conversations = convs as ChatConversation[];
          this.conversations.forEach(c => this.updateInterlocutorInfo(c));
          const retryTarget = this.conversations.find(c => Number(c.id) === conversationId);
          if (retryTarget) {
            this.selectConversation(retryTarget);
            this.isGlobalSearching = false;
            this.searchQuery = '';
          }
        });
      }
    }
  }

  // --- Contrôle de saisie ---
  isMessageTooLong(): boolean {
    return this.messageText.length > this.MAX_MESSAGE_CHARS;
  }

  // --- Modale de confirmation ---
  openConfirmModal(type: 'DELETE_CONV' | 'ARCHIVE_CONV' | 'DELETE_MSG', id: number, conv?: ChatConversation) {
    this.modalType = type;
    this.pendingId = id;
    this.pendingConv = conv || null;
    if (type === 'DELETE_CONV') {
      this.modalTitle = 'Supprimer la discussion ?';
      this.modalMessage = 'Cette action est irréversible. Tous vos messages avec cette personne seront effacés.';
    } else if (type === 'ARCHIVE_CONV') {
      this.modalTitle = 'Archiver la conversation ?';
      this.modalMessage = 'La discussion sera déplacée vers vos archives pour libérer votre espace de travail.';
    } else if (type === 'DELETE_MSG') {
      this.modalTitle = 'Supprimer le message ?';
      this.modalMessage = 'Ce message disparaîtra pour vous (le destinataire pourrait encore le voir selon la config serveur).';
    }
    this.showConfirmModal = true;
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
    this.modalType = null;
    this.pendingId = null;
    this.pendingConv = null;
  }

  executeConfirmedAction() {
    if (!this.pendingId && this.modalType !== 'ARCHIVE_CONV') return;
    switch (this.modalType) {
      case 'DELETE_CONV':
        this.chatService.deleteConversation(this.pendingId!).subscribe({
          next: () => {
            this.conversations = this.conversations.filter(c => c.id !== this.pendingId);
            if (this.selectedConversation?.id === this.pendingId) this.selectedConversation = null;
            this.closeConfirmModal();
          }
        });
        break;
      case 'ARCHIVE_CONV':
        if (this.pendingConv) {
          this.chatService.archiveConversation(this.pendingConv.id).subscribe({
            next: () => {
              this.pendingConv!.status = 'ARCHIVED';
              this.selectedConversation = null;
              this.closeConfirmModal();
            }
          });
        }
        break;
      case 'DELETE_MSG':
        this.chatService.deleteMessage(this.pendingId!).subscribe({
          next: () => {
            if (this.selectedConversation) {
              this.selectedConversation.messages = this.selectedConversation.messages.filter(m => m.id !== this.pendingId);
            }
            this.activeMenuId = null;
            this.closeConfirmModal();
          }
        });
        break;
    }
  }

  // --- Filtrage des conversations ---
  get filteredConversations(): ChatConversation[] {
    if (!this.searchQuery.trim() || this.isGlobalSearching) return this.conversations;
    return this.conversations.filter(conv =>
      conv.interlocutorName?.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  // --- Utilisateurs disponibles pour nouvelle conversation (selon le rôle) ---
  get availableUsersForNewChat(): User[] {
    if (!this.currentUser || !this.allPlatformUsers) return [];
    const myRole = this.currentUser.role;
    const myEmail = this.currentUser.email;
    const existingInterlocutorEmails = this.conversations.map(conv =>
      conv.user1Id === myEmail ? conv.user2Id : conv.user1Id
    );
    return this.allPlatformUsers.filter(user => {
      if (!user.email) return false;
      const isNotAlreadyInChat = !existingInterlocutorEmails.includes(user.email);
      let canChatWith = false;
      if (myRole === 'PATIENT') {
        canChatWith = (user.role === 'DOCTOR' || user.role === 'CAREGIVER');
      } else if (myRole === 'DOCTOR') {
        canChatWith = (user.role === 'PATIENT' || user.role === 'CAREGIVER');
      } else if (myRole === 'CAREGIVER') {
        canChatWith = true;
      }
      return isNotAlreadyInChat && canChatWith;
    });
  }

  @HostListener('document:click')
  closeMenus() {
    this.activeMenuId = null;
    this.showEmojiPicker = false;
  }

  // --- Logique temps réel ---
  selectConversation(conv: ChatConversation): void {
    this.selectedConversation = conv;
    this.chatService.getMessages(conv.id).subscribe({
      next: (msgs) => {
        if (this.selectedConversation) {
          this.selectedConversation.messages = msgs as ChatMessage[];
          this.scrollToBottom();
          this.initRealTime(conv.id);
        }
      }
    });
  }

  private initRealTime(conversationId: number): void {
    this.unsubscribeAll();
    this.messageSubscription = this.chatService.watchMessages(conversationId).subscribe({
      next: (incomingMsg: Message) => {
        if (this.selectedConversation) {
          const isDuplicate = this.selectedConversation.messages.some(m => m.id === incomingMsg.id);
          if (!isDuplicate) {
            this.selectedConversation.messages.push(incomingMsg as ChatMessage);
            this.scrollToBottom();
          }
        }
      },
      error: (err) => console.error("Erreur flux messages:", err)
    });
    this.callSubscription = this.chatService.watchCalls(conversationId).subscribe({
      next: (callEvent: Call) => this.handleIncomingCallRealTime(callEvent),
      error: (err) => console.error("Erreur flux appels:", err)
    });
  }

  private handleIncomingCallRealTime(call: Call): void {
    if (call.status === 'INITIATED' && call.callerId !== this.currentUser?.email) {
      this.incomingCall = call;
      this.isCallModalOpen = true;
    } else if (call.status === 'COMPLETED') {
      this.isCallModalOpen = false;
      this.currentCall = null;
      this.incomingCall = null;
    }
  }

  // --- Appels ---
  handleStartCall() {
    const userEmail = this.currentUser?.email;
    if (!this.selectedConversation || !userEmail) return;
    this.chatService.startCall(this.selectedConversation.id, userEmail).subscribe({
      next: (call: Call) => {
        this.currentCall = call;
        this.isCallModalOpen = true;
      },
      error: (err) => {
        if (err.error?.message === 'USER_BUSY' || err.message?.includes('USER_BUSY')) {
          alert("Ce correspondant est déjà en ligne. Réessayez plus tard.");
        } else if (err.error?.message === 'TOO_MANY_UNREAD' || err.message?.includes('TOO_MANY_UNREAD')) {
          alert("Veuillez attendre une réponse à vos messages précédents avant de passer un appel.");
        } else {
          alert("Impossible de lancer l'appel pour le moment.");
        }
      }
    });
  }

  handleEndCall() {
    const callToEnd = this.currentCall || this.incomingCall;
    if (callToEnd) {
      this.chatService.endCall(callToEnd.id).subscribe({
        next: () => {
          this.isCallModalOpen = false;
          this.currentCall = null;
          this.incomingCall = null;
        }
      });
    }
  }

  // --- Gestion des messages ---
  handleSendMessage(): void {
    const currentEmail = this.currentUser?.email;
    if (!this.messageText.trim() || !this.selectedConversation || !currentEmail) return;
    if (this.isMessageTooLong() || this.containsBadWords(this.messageText)) return;
    this.chatService.postMessage(this.selectedConversation.id, currentEmail, this.messageText).subscribe({
      next: (newMessage: Message) => {
        const isDuplicate = this.selectedConversation?.messages.some(m => m.id === newMessage.id);
        if (!isDuplicate) {
          this.selectedConversation?.messages.push(newMessage as ChatMessage);
          this.scrollToBottom();
        }
        this.messageText = '';
      }
    });
  }

  startEdit(msg: ChatMessage) {
    this.editingMessageId = msg.id;
    this.editContent = msg.content;
    this.activeMenuId = null;
  }

  cancelEdit() {
    this.editingMessageId = null;
  }

  saveEdit(msg: ChatMessage) {
    if (!this.editContent.trim() || this.containsBadWords(this.editContent)) return;
    this.chatService.updateMessage(msg.id, this.editContent).subscribe({
      next: () => {
        msg.content = this.editContent;
        this.cancelEdit();
      }
    });
  }

  confirmDeleteMessage(id: number) {
    this.openConfirmModal('DELETE_MSG', id);
  }

  handleArchiveConversation(conv: ChatConversation, event: Event) {
    event.stopPropagation();
    this.openConfirmModal('ARCHIVE_CONV', conv.id, conv);
  }

  confirmDeleteConversation(id: number, event: Event) {
    event.stopPropagation();
    this.openConfirmModal('DELETE_CONV', id);
  }

  // --- Fichiers et émojis ---
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    const currentEmail = this.currentUser?.email;
    if (file && this.selectedConversation && currentEmail) {
      this.chatService.uploadFile(this.selectedConversation.id, file, currentEmail).subscribe({
        next: (newMessage: Message) => {
          const isDuplicate = this.selectedConversation?.messages.some(m => m.id === newMessage.id);
          if (!isDuplicate) {
            this.selectedConversation?.messages.push(newMessage as ChatMessage);
            this.scrollToBottom();
          }
          event.target.value = '';
        }
      });
    }
  }

  isImage(fileType: string | undefined): boolean {
    return fileType ? fileType.startsWith('image/') : false;
  }

  toggleEmojiPicker(event: Event): void {
    event.stopPropagation();
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string, event: Event): void {
    event.stopPropagation();
    this.messageText += emoji;
  }

  // --- Sécurité et modération ---
  loadForbiddenWords(): void {
    this.chatService.getForbiddenWords().subscribe({
      next: (words) => this.badWords = words,
      error: (err) => console.error("Erreur mots interdits", err)
    });
  }

  public containsBadWords(text: string): boolean {
    if (!text || this.badWords.length === 0) return false;
    const lowerText = text.toLowerCase();
    return this.badWords.some(word => lowerText.includes(word.toLowerCase()));
  }

  // --- Chargement des données ---
  loadUsersFromPlatform(): void {
    this.chatService.getAllUsers().subscribe({
      next: (users: User[]) => {
        this.allPlatformUsers = users.filter(u => u.email !== this.currentUser?.email);
      }
    });
  }

  loadConversations(userEmail: string): void {
    this.chatService.getConversations(userEmail).subscribe({
      next: (data: any[]) => {
        this.conversations = data as ChatConversation[];
        this.conversations.forEach(conv => this.updateInterlocutorInfo(conv));
      }
    });
  }

  updateInterlocutorInfo(conv: ChatConversation) {
    const otherEmail = this.currentUser?.email === conv.user1Id ? conv.user2Id : conv.user1Id;
    if (otherEmail) {
      this.chatService.getUserProfile(otherEmail).subscribe({
        next: (p) => {
          conv.interlocutorName = p.name;
          conv.interlocutorAvatar = p.profilePicture;
        }
      });
    }
  }

  // ✅ MODIFICATION ICI : normalisation des emails
  handleCreateConversation(targetUserEmail: string) {
    const currentEmail = this.currentUser?.email?.toLowerCase().trim();
    const targetEmail = targetUserEmail.toLowerCase().trim();
    if (!targetEmail || !currentEmail) return;
    this.chatService.createConversation(currentEmail, targetEmail).subscribe({
      next: (newConv: any) => {
        const chatConv = newConv as ChatConversation;
        chatConv.messages = [];
        this.updateInterlocutorInfo(chatConv);
        this.conversations.unshift(chatConv);
        this.selectConversation(chatConv);
      }
    });
  }

  // --- UI ---
  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.querySelector('.chat-container');
      if (container) container.scrollTop = container.scrollHeight;
    }, 100);
  }

  translateMessage(msg: ChatMessage) {
    if (msg.translatedContent) {
      msg.translatedContent = null;
      return;
    }
    const textToTranslate = encodeURIComponent(msg.content);
    const langPair = `fr|${this.targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${textToTranslate}&langpair=${langPair}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.responseStatus === 200 && data.responseData.translatedText) {
          msg.translatedContent = data.responseData.translatedText;
        }
      });
  }
} 
