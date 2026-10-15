<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\MessageTemplate;
use App\Models\OutboundMessage;
use App\Models\Setting;
use App\Services\MessageDispatcher;
use App\Services\MessageRenderer;
use App\Services\SmsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CommunicationController extends Controller
{
    public function templates(): JsonResponse
    {
        return response()->json(['data' => MessageTemplate::orderBy('channel')->orderBy('id')->get(), 'variables' => MessageRenderer::VARIABLES]);
    }

    public function saveTemplate(Request $request, ?int $id = null): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'channel' => ['required', Rule::in(['sms', 'email'])],
            'category' => ['required', Rule::in(['reminder', 'meeting', 'notification'])],
            'subject' => 'nullable|required_if:channel,email|string|max:255|not_regex:/[\r\n]/',
            'body' => 'required|string|max:5000',
            'enabled' => 'required|boolean',
        ]);
        $renderer = app(MessageRenderer::class);
        $renderer->validateTemplate($data['body']);
        $renderer->validateTemplate($data['subject'] ?? '');
        if ($data['channel'] === 'sms') $data['subject'] = null;
        $template = $id ? MessageTemplate::findOrFail($id) : new MessageTemplate;
        $template->fill($data)->save();
        $this->audit($request, 'communications.template_saved', ['template_id' => $template->id]);
        return response()->json($template, $id ? 200 : 201);
    }

    public function messages(): JsonResponse
    {
        return response()->json(OutboundMessage::latest('id')->paginate(20));
    }

    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'template_id' => 'required|integer|exists:message_templates,id',
            'recipient' => 'required|string|max:255',
            'variables' => 'present|array',
            'variables.*' => 'nullable|string|max:2000',
            // Require an explicit offset; browser sends ISO UTC, no server timezone ambiguity.
            'scheduled_at' => ['nullable', 'date', 'after:now', 'regex:/(Z|[+-]\d{2}:\d{2})$/'],
        ]);
        $template = MessageTemplate::findOrFail($data['template_id']);
        if (!$template->enabled) throw ValidationException::withMessages(['template_id' => 'This template is disabled.']);
        $recipient = $template->channel === 'sms' ? SmsService::normalizePhone($data['recipient']) : $data['recipient'];
        if ($template->channel === 'email' && !filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            throw ValidationException::withMessages(['recipient' => 'Enter a valid email address.']);
        }
        if ($template->channel === 'sms' && (!Setting::get('sms_enabled', false) || !Setting::get('sms_api_key'))) {
            throw ValidationException::withMessages(['recipient' => 'Enable SMS and save an Arkesel API key first.']);
        }
        $renderer = app(MessageRenderer::class);
        $body = $renderer->render($template->body, $data['variables']);
        $subject = $template->channel === 'email' ? $renderer->render($template->subject ?? '', $data['variables']) : null;
        if (mb_strlen($body) > ($template->channel === 'sms' ? 1600 : 10000) || ($subject && (mb_strlen($subject) > 255 || preg_match('/[\r\n]/', $subject)))) {
            throw ValidationException::withMessages(['variables' => 'Rendered message or subject is too long, or subject contains a line break.']);
        }
        $message = \Illuminate\Support\Facades\DB::transaction(function () use ($request, $template, $recipient, $subject, $body, $data) {
            $message = OutboundMessage::create([
                'created_by' => $request->user()->id, 'channel' => $template->channel,
                'recipient' => $recipient, 'subject' => $subject, 'body' => $body,
                'status' => 'pending', 'scheduled_at' => isset($data['scheduled_at']) ? Carbon::parse($data['scheduled_at'])->utc() : now(),
            ]);
            $this->audit($request, 'communications.message_created', ['message_id' => $message->id, 'channel' => $message->channel]);
            return $message;
        });
        if (empty($data['scheduled_at'])) app(MessageDispatcher::class)->dispatch($message);
        return response()->json($message->fresh(), 201);
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $message = OutboundMessage::findOrFail($id);
        $updated = OutboundMessage::whereKey($id)->where('status', 'pending')->update(['status' => 'cancelled', 'updated_at' => now()]);
        abort_unless($updated, 409, 'Only pending messages can be cancelled.');
        $this->audit($request, 'communications.message_cancelled', ['message_id' => $id]);
        return response()->json($message->fresh());
    }

    public function testSms(Request $request): JsonResponse
    {
        $data = $request->validate(['recipient' => 'required|string|max:30']);
        $phone = SmsService::normalizePhone($data['recipient']);
        try {
            $id = app(SmsService::class)->send($phone, 'Evolex Hub: your SMS configuration test. No action is required.');
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'SMS acceptance not confirmed. Check SMS enabled, API key, balance and approved sender in Arkesel before retrying.'], 502);
        }
        $this->audit($request, 'sms.test_accepted', []);
        return response()->json(['success' => true, 'message' => 'Arkesel accepted the test SMS. This is not a delivery receipt.', 'provider_id' => $id]);
    }

    private function audit(Request $request, string $action, array $meta): void
    {
        AuditLog::create(['user_id' => $request->user()->id, 'action' => $action, 'meta' => $meta, 'ip_address' => $request->ip()]);
    }
}
