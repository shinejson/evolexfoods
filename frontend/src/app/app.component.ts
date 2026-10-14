import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IdleTimeoutService } from './core/services/idle-timeout.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'frontend';

  constructor(private readonly idleTimeout: IdleTimeoutService) {
    // Keep the timeout active across every authenticated route, not just the shell.
    this.idleTimeout.start();
  }
}
