<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class MessageRenderer
{
    public const VARIABLES = ['name', 'title', 'date', 'time', 'location', 'details'];

    public function validateTemplate(string $text): void
    {
        preg_match_all('/{{\s*([a-zA-Z0-9_]+)\s*}}/', $text, $matches);
        $unknown = array_diff($matches[1], self::VARIABLES);
        $remaining = preg_replace('/{{\s*([a-zA-Z0-9_]+)\s*}}/', '', $text);
        if ($unknown || str_contains($remaining, '{{') || str_contains($remaining, '}}')) {
            throw ValidationException::withMessages(['body' => 'Use only supported placeholders: '.implode(', ', self::VARIABLES).'.']);
        }
    }

    public function render(string $text, array $variables): string
    {
        $this->validateTemplate($text);
        return preg_replace_callback('/{{\s*([a-zA-Z0-9_]+)\s*}}/', function ($match) use ($variables) {
            $value = trim((string) ($variables[$match[1]] ?? ''));
            if ($value === '') {
                throw ValidationException::withMessages(['variables.'.$match[1] => 'Enter a value for '.$match[1].'.']);
            }
            return $value;
        }, $text);
    }
}
