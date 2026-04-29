import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../front-office/pages/login/auth.service';

@Component({
  selector: 'app-video-consultation-page',
  templateUrl: './video-consultation-page.component.html',
  styleUrls: ['./video-consultation-page.component.css']
})
export class VideoConsultationPageComponent implements OnInit {
  roomName: string = '';
  userName: string = '';
  userEmail: string = '';
  isDoctor: boolean = false;
  isReady: boolean = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get room name from route params: /appointments/video/:appointmentId
    const appointmentId = this.route.snapshot.paramMap.get('appointmentId');

    if (!appointmentId) {
      this.error = 'Invalid consultation link.';
      return;
    }

    // Room name is based on appointment ID — same for doctor and patient
    this.roomName = `EverCare-${appointmentId}`;

    // Get current user info from auth service
    const user = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = `${user.name || ''}`.trim() || user.email;
        this.userEmail = user.email || '';
        this.isDoctor = user.role === 'DOCTOR';
      } else {
        this.error = 'You must be logged in to join a consultation.';
        return;
      }
    });


    this.isReady = true;
  }
}
