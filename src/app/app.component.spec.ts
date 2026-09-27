import { Subject } from 'rxjs';
import { AppComponent } from './app.component';

describe('AppComponent completion notifications', () => {
  it('suppresses completion toasts when the browser preference is disabled', () => {
    const completion$ = new Subject<any>();
    const messageService = jasmine.createSpyObj('MessageService', ['add']);
    const preferences = { value: { runCompletionNotifications: false } };
    const component = new AppComponent(
      messageService,
      { getCompletionMessages: () => completion$.asObservable() } as any,
      preferences as any,
    );
    component.ngOnInit();

    completion$.next({ success: true, run_name: 'Run 1' });

    expect(messageService.add).not.toHaveBeenCalled();
    preferences.value.runCompletionNotifications = true;
    completion$.next({ success: false, run_name: 'Run 2' });
    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ summary: 'Run failed' }));
    component.ngOnDestroy();
  });
});
