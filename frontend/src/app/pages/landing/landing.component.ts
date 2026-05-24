import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';
import { Role, ROLE_LABELS } from '../../core/models/models';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
})
export class LandingComponent implements OnInit {
  private api = inject(ApiService);
  private session = inject(SessionService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  mode = signal<'create' | 'join'>('create');
  loading = signal(false);

  // Form fields
  roomName = '';
  adminName = '';
  team = '';

  joinName = '';
  joinRole: Role = 'developer';
  joinRoomId = '';

  roleOptions: { value: Role; label: string }[] = [
    { value: 'developer', label: ROLE_LABELS['developer'] },
    { value: 'tester', label: ROLE_LABELS['tester'] },
    { value: 'business_analyst', label: ROLE_LABELS['business_analyst'] },
    { value: 'observer', label: ROLE_LABELS['observer'] },
  ];

  get theme() { return this.session.theme(); }

  ngOnInit(): void {
    const roomId = this.route.snapshot.paramMap.get('roomId');
    if (roomId) {
      this.mode.set('join');
      this.joinRoomId = roomId;
    }
  }

  toggleTheme(): void { this.session.toggleTheme(); }

  createRoom(): void {
    if (!this.roomName.trim() || !this.adminName.trim()) {
      this.toast.warning('Please enter a session name and your name.');
      return;
    }
    this.loading.set(true);
    this.api
      .createRoom({
        room_name: this.roomName.trim(),
        admin_name: this.adminName.trim(),
        team: this.team.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.session.setIdentity({
            roomId: res.room_id,
            userId: res.user_id,
            role: res.role,
            name: this.adminName.trim(),
          });
          this.toast.success('Session created. You are the Scrum Master.');
          this.router.navigate(['/room', res.room_id]);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Could not create the session. Is the backend running?');
        },
      });
  }

  joinRoom(): void {
    const roomId = this.joinRoomId.trim();
    if (!roomId || !this.joinName.trim()) {
      this.toast.warning('Please enter the room ID and your name.');
      return;
    }
    this.loading.set(true);
    this.api.joinRoom(roomId, { name: this.joinName.trim(), role: this.joinRole }).subscribe({
      next: (res) => {
        this.session.setIdentity({
          roomId: res.room_id,
          userId: res.user_id,
          role: res.role,
          name: this.joinName.trim(),
        });
        this.toast.success('Joined the session.');
        this.router.navigate(['/room', res.room_id]);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 404) this.toast.error('Room not found. Check the ID.');
        else this.toast.error('Could not join the session.');
      },
    });
  }
}
