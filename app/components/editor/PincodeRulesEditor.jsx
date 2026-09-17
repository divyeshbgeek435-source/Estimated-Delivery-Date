import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { locationKey, namesMatch } from "../../lib/geo";
import { PINCODE_COUNTRIES, WEIGHT_DISPLAY_MODES, groupDeliveryLocations, hasLocation } from "../../lib/pincode";

function normalizePinEntries(entries = [], city = "") {
  return (entries || [])
    .map((item) =>
      typeof item === "string" || typeof item === "number"
        ? { code: String(item) }
        : { code: String(item?.code || ""), label: item?.label || city },
    )
    .filter((item) => item.code);
}

function sameDeliveryLocation(left, right) {
  if (!left || !right) return false;
  if (String(left.country || "").toUpperCase() !== String(right.country || "").toUpperCase()) return false;
  if (!namesMatch(left.city, right.city)) return false;
  if (!left.state || !right.state) return true;
  return namesMatch(left.state, right.state);
}

function locationIdentity(location) {
  return locationKey(location?.country, location?.city, location?.state || "");
}

async function loadCityPincodes(country, city, state = "", { refresh = false } = {}) {
  const params = new URLSearchParams({
    country,
    city,
    state: state || "",
    pincodes: "1",
  });
  if (refresh) params.set("refresh", "1");
  const response = await fetch(`/app/geo?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load pincodes (${response.status})`);
  }
  const payload = await response.json();
  return {
    pincodes: Array.isArray(payload?.pincodes) ? payload.pincodes : [],
    state: payload?.state || state || "",
  };
}

export function PincodeRulesEditor({ shipping, onChange, errors = {} }) {
  const pincode = shipping.pincodeRules || {
    enabled: false,
    country: "IN",
    countries: [],
    locations: [],
    pincodes: [],
  };
  const weight = shipping.weightRules || { value: "", unit: "kg" };
  const directWeight = weight.displayMode === WEIGHT_DISPLAY_MODES.DIRECT;
  const pincodeEnabled = Boolean(pincode.enabled) && !directWeight;
  const [countryPick, setCountryPick] = useState("");
  const [addingKey, setAddingKey] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [loadingKeys, setLoadingKeys] = useState(() => new Set());
  const [failedKeys, setFailedKeys] = useState(() => new Set());
  const latest = useRef(pincode);
  const inFlight = useRef(new Set());
  latest.current = pincode;

  const setPincode = (patch) => onChange({ pincodeRules: { ...latest.current, ...patch } });
  const countries = pincode.countries || [];
  const locations = pincode.locations || [];
  const groups = groupDeliveryLocations(pincode);

  const markLoading = (key, busy) => {
    setLoadingKeys((current) => {
      const next = new Set(current);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const markFailed = (key, failed) => {
    setFailedKeys((current) => {
      const next = new Set(current);
      if (failed) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const fillLocationPincodes = async (location, { force = false } = {}) => {
    if (!location?.city) return;
    const key = locationIdentity(location);
    if (!force && inFlight.current.has(key)) return;
    if (!force && (location.pincodes || []).length > 0) return;

    inFlight.current.add(key);
    markLoading(key, true);
    markFailed(key, false);
    setLookupError("");

    try {
      const result = await loadCityPincodes(location.country, location.city, location.state, {
        refresh: force,
      });
      const pins = normalizePinEntries(result.pincodes, location.city);
      const current = latest.current.locations || [];
      const at = current.findIndex((item) => sameDeliveryLocation(item, location));
      if (at < 0) return;

      if (!pins.length) {
        markFailed(key, true);
        setLookupError(`No pincodes found for ${location.city}. Try Remove and add the city again.`);
        return;
      }

      setPincode({
        locations: current.map((item, currentIndex) =>
          currentIndex === at
            ? {
                ...item,
                state: result.state || item.state,
                pincodes: pins,
              }
            : item,
        ),
      });
      markFailed(key, false);
    } catch {
      markFailed(key, true);
      setLookupError(`Could not fetch pincodes for ${location.city}. Use Retry.`);
    } finally {
      inFlight.current.delete(key);
      markLoading(key, false);
    }
  };

  useEffect(() => {
    for (const location of latest.current.locations || []) {
      if ((location.pincodes || []).length) continue;
      fillLocationPincodes(location);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations.length, locations.map((item) => `${locationIdentity(item)}:${(item.pincodes || []).length}`).join("|")]);

  const addCountry = (iso) => {
    const current = latest.current;
    const currentCountries = current.countries || [];
    if (!iso || currentCountries.includes(iso)) {
      setCountryPick("");
      return;
    }
    setLookupError("");
    setPincode({
      enabled: true,
      country: iso,
      countries: [...currentCountries, iso],
      locations: current.locations || [],
    });
    setCountryPick("");
  };

  const removeCountry = (event, iso) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const current = latest.current;
    const country = String(iso || "").toUpperCase();
    const nextCountries = (current.countries || []).filter(
      (item) => String(item || "").toUpperCase() !== country,
    );
    const nextLocations = (current.locations || []).filter(
      (item) => String(item.country || "").toUpperCase() !== country,
    );
    for (const key of [...inFlight.current]) {
      if (key.startsWith(`${country}|`)) inFlight.current.delete(key);
    }
    setLoadingKeys((currentKeys) => new Set([...currentKeys].filter((key) => !key.startsWith(`${country}|`))));
    setFailedKeys((currentKeys) => new Set([...currentKeys].filter((key) => !key.startsWith(`${country}|`))));
    setLookupError("");
    setPincode({
      enabled: nextLocations.length > 0 ? current.enabled : current.enabled,
      countries: nextCountries,
      locations: nextLocations,
      country: nextCountries[0] || "IN",
      pincodes: [],
    });
  };

  const addCity = async (country, city, state) => {
    const current = latest.current;
    if (!city || hasLocation(current, country, city, state)) return;
    const key = locationKey(country, city, state);
    setAddingKey(key);
    setLookupError("");
    markLoading(key, true);
    try {
      const result = await loadCityPincodes(country, city, state);
      const latestCountries = latest.current.countries || [];
      const pins = normalizePinEntries(result.pincodes, city);
      const resolvedState = result.state || state || "";
      const resolvedKey = locationKey(country, city, resolvedState);
      const nextLocation = {
        country,
        city,
        state: resolvedState,
        weight: weight.value || "",
        unit: weight.unit || "kg",
        pincodes: pins,
      };
      setPincode({
        enabled: true,
        country,
        countries: latestCountries.includes(country) ? latestCountries : [...latestCountries, country],
        locations: [...(latest.current.locations || []), nextLocation],
      });
      if (!pins.length) {
        markFailed(resolvedKey, true);
        setLookupError(`Added ${city}, but no pincode list was found. Try Retry on that city.`);
      } else {
        markFailed(resolvedKey, false);
      }
    } catch {
      setLookupError("Could not fetch pincodes for this city. Try again.");
    } finally {
      setAddingKey("");
      markLoading(key, false);
    }
  };

  const removeLocation = (event, target) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const current = latest.current.locations || [];
    const nextLocations = current.filter((item) => !sameDeliveryLocation(item, target));
    for (const item of current) {
      if (!sameDeliveryLocation(item, target)) continue;
      const key = locationIdentity(item);
      inFlight.current.delete(key);
      markLoading(key, false);
      markFailed(key, false);
    }
    setLookupError("");
    setPincode({
      locations: nextLocations,
      countries:
        nextLocations.some((item) => String(item.country || "").toUpperCase() === String(target.country || "").toUpperCase())
          ? latest.current.countries || []
          : (latest.current.countries || []).filter(
              (item) => String(item || "").toUpperCase() !== String(target.country || "").toUpperCase(),
            ),
      pincodes: [],
    });
  };

  return (
    <s-section heading="Pincode / delivery">
      <s-paragraph color="subdued">
        Select a country, then a city - one at a time. All pincodes for that city are added automatically.
      </s-paragraph>

      {directWeight ? (
        <s-banner>
          Pincode check is hidden on the product page because weight is shown directly. Switch to “Enter pincode
          and show weight” if customers should check a pincode first.
        </s-banner>
      ) : (
        <label className="edd-switch">
          <input
            type="checkbox"
            checked={pincodeEnabled}
            onChange={(event) => {
              const enabled = Boolean(event.currentTarget.checked);
              onChange({
                pincodeRules: { ...latest.current, enabled },
                ...(enabled
                  ? { weightRules: { ...weight, displayMode: WEIGHT_DISPLAY_MODES.PINCODE } }
                  : {}),
              });
            }}
          />
          <span>Enable pincode check on the product page</span>
        </label>
      )}

      {pincodeEnabled ? (
        <div className="edd-pin-editor">
          <s-select
            label="Country"
            value={countryPick}
            placeholder="Select country"
            onChange={(event) => addCountry(event.currentTarget.value)}
          >
            {PINCODE_COUNTRIES.filter((item) => !countries.includes(item.value)).map((item) => (
              <s-option key={item.value} value={item.value}>
                {item.label}
              </s-option>
            ))}
          </s-select>

          {groups.length ? (
            <div className="edd-geo-tree">
              {groups.map((group) => (
                <CountryBlock
                  key={group.country}
                  group={group}
                  addingKey={addingKey}
                  loadingKeys={loadingKeys}
                  failedKeys={failedKeys}
                  onAddCity={addCity}
                  onRemoveLocation={removeLocation}
                  onRemoveCountry={removeCountry}
                  onRetry={(city) => fillLocationPincodes(city, { force: true })}
                />
              ))}
            </div>
          ) : (
            <p className="edd-help">Select a country to start. Then select a city under that country.</p>
          )}

          {lookupError || errors.pincodeRules ? (
            <p className="edd-field-error">{lookupError || errors.pincodeRules}</p>
          ) : null}
        </div>
      ) : null}
    </s-section>
  );
}

function CountryBlock({
  group,
  addingKey,
  loadingKeys,
  failedKeys,
  onAddCity,
  onRemoveLocation,
  onRemoveCountry,
  onRetry,
}) {
  const busy = addingKey.startsWith(`${group.country}|`);
  return (
    <div className="edd-geo-country">
      <div className="edd-geo-country__head">
        <strong>{group.label}</strong>
        <button
          type="button"
          className="edd-pin-list__remove"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemoveCountry(event, group.country);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemoveCountry(event, group.country);
          }}
        >
          Remove
        </button>
      </div>
      <CitySelect
        country={group.country}
        added={group.cities}
        disabled={Boolean(addingKey)}
        onAdd={(city, state) => onAddCity(group.country, city, state)}
      />
      {busy ? <p className="edd-help">Fetching all pincodes for this city…</p> : null}
      {group.cities.length ? (
        <ul className="edd-geo-cities">
          {group.cities.map((city) => {
            const key = locationIdentity(city);
            const pins = city.pincodes || [];
            const loading = loadingKeys.has(key) || loadingKeys.has(locationKey(city.country, city.city, ""));
            const failed = failedKeys.has(key) || failedKeys.has(locationKey(city.country, city.city, ""));
            return (
              <li key={key} className="edd-geo-city">
                <div className="edd-geo-city__head">
                  <div>
                    <strong>{city.city}</strong>
                    <span>
                      {city.state ? `${city.state} · ` : ""}
                      {pins.length} pincodes
                    </span>
                  </div>
                  <div className="edd-geo-city__actions">
                    {failed || (!pins.length && !loading) ? (
                      <button
                        type="button"
                        className="edd-pin-list__remove"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onRetry(city);
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onRetry(city);
                        }}
                      >
                        Retry
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="edd-pin-list__remove"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onRemoveLocation(event, city);
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onRemoveLocation(event, city);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {loading ? (
                  <p className="edd-help">Fetching pincodes for this city…</p>
                ) : pins.length ? (
                  <ul className="edd-geo-pins">
                    {pins.map((item) => (
                      <li key={item.code || item} className="edd-geo-pin">
                        {item.code || item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="edd-help">No pincodes loaded yet. Click Retry.</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="edd-help">Select a city to add it. Every pincode for that city is added automatically.</p>
      )}
    </div>
  );
}

function CitySelect({ country, added, disabled, onAdd }) {
  const namesFetcher = useFetcher();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) return undefined;
    const timer = setTimeout(() => {
      namesFetcher.load(`/app/geo?country=${encodeURIComponent(country)}&suggest=${encodeURIComponent(needle)}`);
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, query]);

  const addedNames = useMemo(
    () => new Set((added || []).map((item) => String(item.city || "").trim().toLowerCase())),
    [added],
  );
  const records = useMemo(() => {
    const names = namesFetcher.data?.cities || namesFetcher.data?.names || [];
    return names.map((item) => (typeof item === "string" ? { name: item, state: "" } : item));
  }, [namesFetcher.data]);

  const needle = query.trim().toLowerCase();
  const visible =
    needle.length < 2
      ? []
      : records
          .filter((item) => {
            const name = item.name || "";
            if (addedNames.has(name.toLowerCase())) return false;
            return true;
          })
          .slice(0, 12);

  const loading = namesFetcher.state !== "idle";
  const selectCity = (item) => {
    if (!item?.name) return;
    onAdd(item.name, item.state || "");
    setQuery("");
  };

  return (
    <div className="edd-geo-city-add">
      <s-search-field
        label="City"
        value={query}
        disabled={disabled}
        placeholder="Type a city name, then select it"
        labelAccessibilityVisibility="exclusive"
        onInput={(event) => setQuery(event.currentTarget.value || "")}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
      ></s-search-field>
      {query.trim().length > 0 && query.trim().length < 2 ? (
        <p className="edd-help">Keep typing to find a city.</p>
      ) : null}
      {visible.length ? (
        <ul className="edd-geo-suggest">
          {visible.map((item) => (
            <li key={`${item.name}|||${item.state || ""}`}>
              <button type="button" disabled={disabled} onClick={() => selectCity(item)}>
                {item.state ? `${item.name}, ${item.state}` : item.name}
              </button>
            </li>
          ))}
        </ul>
      ) : needle.length >= 2 && !loading ? (
        <p className="edd-help">Not Found. No city matches “{query.trim()}”.</p>
      ) : needle.length >= 2 && loading ? (
        <p className="edd-help">Searching cities…</p>
      ) : null}
    </div>
  );
}
