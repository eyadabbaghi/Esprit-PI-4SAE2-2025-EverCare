import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';

import { AuthService, User } from '../../../front-office/pages/login/auth.service';

import { ChatService } from '../../services/chat.service';

import { Message, Conversation, Call } from '../../models/messages.model';

import { Subscription } from 'rxjs';



// Interface étendue pour supporter la traduction dynamiquement

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



  // --- NOUVELLES VARIABLES POUR LA RECHERCHE AVANCÉE ---

  searchResults: any[] = [];

  isGlobalSearching: boolean = false;



  // --- CONTRÔLE DE SAISIE ---

  readonly MAX_MESSAGE_CHARS = 50;



  // --- Gestion de la Modale de Confirmation Personnalisée ---

  showConfirmModal: boolean = false;

  modalTitle: string = '';

  modalMessage: string = '';

  modalType: 'DELETE_CONV' | 'ARCHIVE_CONV' | 'DELETE_MSG' | null = null;

  pendingId: number | null = null;

  pendingConv: ChatConversation | null = null;



  // Traduction

  targetLang: string = 'en';



  // Gestion des appels

  currentCall: Call | null = null;

  isCallModalOpen: boolean = false;

  incomingCall: Call | null = null;



  showEmojiPicker: boolean = false;

  emojiList: string[] = ['😊', '😂', '🥰', '😍', '😒', '😭', '😎', '🙏', '👍', '🔥', '✨', '❤️', '🩺', '💊', '🏥', '🚑', '💉', '🩹', '🩸', '👨‍⚕️', '👩‍⚕️', '🆘', '⚠️'];

  badWords: string[] = [];



  // WebSocket Subscriptions

  private messageSubscription: Subscription | null = null;

  private callSubscription: Subscription | null = null;



  constructor(private authService: AuthService, public chatService: ChatService) { }



  ngOnInit(): void {

    this.loadForbiddenWords();

    this.authService.currentUser$.subscribe((user: User | null) => {

      this.currentUser = user;

      if (user && user.userId) {

        this.loadConversations(user.userId);

        this.loadUsersFromPlatform();

      }

    });

  }



  ngOnDestroy(): void {

    this.unsubscribeAll();

  }



  private unsubscribeAll(): void {

    if (this.messageSubscription) this.messageSubscription.unsubscribe();

    if (this.callSubscription) this.callSubscription.unsubscribe();

  }



  // --- LOGIQUE DE RECHERCHE GLOBALE (BACKEND) ---



  onSearchInput(query: string) {

    // Si la requête est trop courte, on revient à la liste normale des conversations

    if (!query || query.trim().length < 3) {

      this.isGlobalSearching = false;

      this.searchResults = [];

      return;

    }



    this.isGlobalSearching = true;

    const userId = this.currentUser?.userId;

    if (userId) {

      this.chatService.searchGlobalMessages(userId, query).subscribe({

        next: (results) => {

          this.searchResults = results;

        },

        error: (err) => console.error('Erreur recherche globale:', err)

      });

    }

  }



  selectConversationFromSearch(msg: any) {

    // On force la conversion en Number pour correspondre à l'ID de la conversation

    const conversationId = Number(msg.conversationId || msg.idConversation || (msg.conversation ? msg.conversation.id : null));



    if (!conversationId) {

      console.error("ID manquant dans l'objet :", msg);

      return;

    }



    // On cherche dans la liste chargée

    const targetConv = this.conversations.find(c => Number(c.id) === conversationId);



    if (targetConv) {

      this.selectConversation(targetConv);

      this.isGlobalSearching = false;

      this.searchQuery = '';

    } else {

      // Si la conversation n'est pas dans la liste de gauche, on la recharge

      if (this.currentUser?.userId) {

        this.chatService.getConversations(this.currentUser.userId).subscribe(convs => {

          this.conversations = convs as ChatConversation[];

          // On refait les infos d'interlocuteurs pour la nouvelle liste

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



  // --- LOGIQUE DE CONTRÔLE DE SAISIE ---



  isMessageTooLong(): boolean {

    return this.messageText.length > this.MAX_MESSAGE_CHARS;

  }



  // --- LOGIQUE DE CONFIRMATION ---



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



  // --- RECHERCHE ET FILTRAGE (FRONTEND - POUR LES NOMS D'UTILISATEURS) ---



  get filteredConversations(): ChatConversation[] {

    if (!this.searchQuery.trim() || this.isGlobalSearching) return this.conversations;

    return this.conversations.filter(conv =>

      conv.interlocutorName?.toLowerCase().includes(this.searchQuery.toLowerCase())

    );

  }



  get availableUsersForNewChat(): User[] {

    if (!this.currentUser || !this.allPlatformUsers) return [];



    const myRole = this.currentUser.role;

    const currentUserId = this.currentUser.userId;



    const existingInterlocutorIds = this.conversations

      .map(conv => conv.user1Id === currentUserId ? conv.user2Id : conv.user1Id)

      .filter((id): id is string => !!id);



    return this.allPlatformUsers.filter(user => {

      if (!user.userId) return false;

      const isNotAlreadyInChat = !existingInterlocutorIds.includes(user.userId);



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



  // --- LOGIQUE TEMPS RÉEL ---



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

      next: (callEvent: Call) => {

        this.handleIncomingCallRealTime(callEvent);

      },

      error: (err) => console.error("Erreur flux appels:", err)

    });

  }



  private handleIncomingCallRealTime(call: Call): void {

    if (call.status === 'INITIATED' && call.callerId !== this.currentUser?.userId) {

      this.incomingCall = call;

      this.isCallModalOpen = true;

    }

    else if (call.status === 'COMPLETED') {

      this.isCallModalOpen = false;

      this.currentCall = null;

      this.incomingCall = null;

    }

  }



  // --- ACTIONS D'APPELS ---



  handleStartCall() {

    const userId = this.currentUser?.userId;

    if (!this.selectedConversation || !userId) return;



    this.chatService.startCall(this.selectedConversation.id, userId).subscribe({

      next: (call: Call) => {

        this.currentCall = call;

        this.isCallModalOpen = true;

      },

      error: (err) => {

        // On vérifie le message d'erreur envoyé par le backend

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



  // --- GESTION DES MESSAGES ---



  handleSendMessage(): void {

    const currentId = this.currentUser?.userId;

    if (!this.messageText.trim() || !this.selectedConversation || !currentId) return;



    if (this.isMessageTooLong() || this.containsBadWords(this.messageText)) return;



    this.chatService.postMessage(this.selectedConversation.id, currentId, this.messageText)

      .subscribe({

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



  // --- FICHIERS ET EMOJIS ---



  onFileSelected(event: any): void {

    const file: File = event.target.files[0];

    const currentId = this.currentUser?.userId;

    if (file && this.selectedConversation && currentId) {

      this.chatService.uploadFile(this.selectedConversation.id, file, currentId).subscribe({

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



  // --- SÉCURITÉ ET MODÉRATION ---



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



  // --- CHARGEMENT DES DONNÉES ---



  loadUsersFromPlatform(): void {

    this.chatService.getAllUsers().subscribe({

      next: (users: User[]) => {

        this.allPlatformUsers = users.filter(u => u.userId !== this.currentUser?.userId);

      }

    });

  }



  loadConversations(userId: string): void {

    this.chatService.getConversations(userId).subscribe({

      next: (data: any[]) => {

        this.conversations = data as ChatConversation[];

        this.conversations.forEach(conv => this.updateInterlocutorInfo(conv));

      }

    });

  }



  updateInterlocutorInfo(conv: ChatConversation) {

    const otherId = this.currentUser?.userId === conv.user1Id ? conv.user2Id : conv.user1Id;

    if (otherId) {

      this.chatService.getUserProfile(otherId).subscribe({

        next: (p) => {

          conv.interlocutorName = p.name;

          conv.interlocutorAvatar = p.profilePicture;

        }

      });

    }

  }



  handleCreateConversation(targetUserId: string) {

    const currentId = this.currentUser?.userId;

    if (!targetUserId || !currentId) return;

    this.chatService.createConversation(currentId, targetUserId).subscribe({

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
