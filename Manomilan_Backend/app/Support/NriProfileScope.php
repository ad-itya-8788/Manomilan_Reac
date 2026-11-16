<?php

namespace App\Support;

use App\Profile;
use Illuminate\Database\Eloquent\Builder;

class NriProfileScope
{
    private const ADDRESS_COUNTRY_TERMS = [
        'United States' => ['united states of america', 'united states', 'u.s.a.', 'usa'],
        'United Kingdom' => ['united kingdom', 'great britain', 'england', 'scotland'],
        'United Arab Emirates' => ['united arab emirates', 'uae', 'dubai', 'abu dhabi'],
        'Canada' => ['canada'],
        'Australia' => ['australia', 'new south wales'],
        'Singapore' => ['singapore'],
        'Germany' => ['germany'],
        'France' => ['france'],
        'Denmark' => ['denmark'],
        'Sweden' => ['sweden'],
        'New Zealand' => ['new zealand'],
        'Malaysia' => ['malaysia'],
        'Netherlands' => ['netherlands'],
        'Japan' => ['japan'],
        'Italy' => ['italy'],
        'Switzerland' => ['switzerland'],
        'Ireland' => ['ireland'],
        'Norway' => ['norway'],
        'Finland' => ['finland'],
        'Belgium' => ['belgium'],
        'Austria' => ['austria'],
        'Romania' => ['romania'],
        'Spain' => ['spain'],
        'Portugal' => ['portugal'],
        'South Africa' => ['south africa'],
        'Saudi Arabia' => ['saudi arabia'],
        'Qatar' => ['qatar'],
        'Kuwait' => ['kuwait'],
        'Bahrain' => ['bahrain'],
        'Oman' => ['oman'],
    ];

    public static function apply(Builder $query, ?string $selectedCountry = null): Builder
    {
        $grammar = $query->getQuery()->getGrammar();
        $currentCountry = $grammar->wrap('addresses->current->country');
        $legacyCountry = $grammar->wrap('addresses->country');
        $country = "NULLIF(NULLIF(LOWER(TRIM(COALESCE(NULLIF($currentCountry, ''), NULLIF($legacyCountry, '')))), ''), 'null')";
        $address = 'LOWER('.$grammar->wrap('addresses->current->address').')';
        $addressCountryPattern = self::addressCountryPattern();

        $query->where(function (Builder $query) use ($country, $address, $addressCountryPattern) {
            $query->whereRaw("$country IS NOT NULL AND $country <> ?", ['india'])
                ->orWhere(function (Builder $query) use ($country, $address, $addressCountryPattern) {
                    $query->whereRaw("$country IS NULL")
                        ->whereRaw("$address REGEXP ?", [$addressCountryPattern]);
                });
        });

        $selectedCountry = strtolower(trim((string) $selectedCountry));
        if ($selectedCountry === '') {
            return $query;
        }

        $countryName = collect(self::ADDRESS_COUNTRY_TERMS)
            ->keys()
            ->first(fn (string $name) => strtolower($name) === $selectedCountry);
        $selectedPattern = $countryName
            ? self::addressCountryPattern(self::ADDRESS_COUNTRY_TERMS[$countryName])
            : null;

        return $query->where(function (Builder $query) use ($country, $address, $selectedCountry, $selectedPattern) {
            $query->whereRaw("$country = ?", [$selectedCountry]);
            if ($selectedPattern !== null) {
                $query->orWhere(function (Builder $addressQuery) use ($country, $address, $selectedPattern) {
                    $addressQuery->whereRaw("$country IS NULL")
                        ->whereRaw("$address REGEXP ?", [$selectedPattern]);
                });
            }
        });
    }

    public static function countryOptions(): array
    {
        return self::apply(Profile::query()->where('profiles.status', 'active'))
            ->get(['addresses'])
            ->map(function (Profile $profile) {
                $addresses = $profile->addresses;
                $currentCountry = data_get($addresses, 'current.country');

                return self::resolveCountry(
                    is_string($currentCountry) && trim($currentCountry) !== ''
                        ? $currentCountry
                        : ($addresses['country'] ?? null),
                    data_get($addresses, 'current.address')
                );
            })
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    public static function countryFromAddress(?string $address): ?string
    {
        $address = strtolower(trim((string) $address));
        if ($address === '') {
            return null;
        }

        foreach (self::ADDRESS_COUNTRY_TERMS as $country => $terms) {
            foreach ($terms as $term) {
                $pattern = '/(^|[^a-z])'.preg_quote($term, '/').'([^a-z]|$)/';
                if (preg_match($pattern, $address) === 1) {
                    return $country;
                }
            }
        }

        return null;
    }

    public static function resolveCountry(mixed $country, mixed $address): ?string
    {
        $country = is_string($country) ? trim($country) : '';
        if ($country !== '' && strtolower($country) !== 'null') {
            return $country;
        }

        return self::countryFromAddress(is_string($address) ? $address : null);
    }

    private static function addressCountryPattern(?array $terms = null): string
    {
        $patternTerms = [];
        foreach ($terms ?? array_merge(...array_values(self::ADDRESS_COUNTRY_TERMS)) as $term) {
            $patternTerms[] = preg_quote($term, '/');
        }

        return '(^|[^a-z])('.implode('|', $patternTerms).')([^a-z]|$)';
    }
}
