import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { locationKey } from "../../lib/geo";
import { PINCODE_COUNTRIES, WEIGHT_DISPLAY_MODES, groupDeliveryLocations, hasLocation } from "../../lib/pincode";

async function loadCityPincodes(country, city, state = "") {
  const params = new URLSearchParams({
    country,
    city,
    state: state || "",
    pincodes: "1",
  });
  const response = await fetch(`/app/geo?${params.toString()}`);
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
  const hydrated = useRef(new Set());
  const latest = useRef(pincode);
  latest.current = pincode;

  const setPincode = (patch) => onChange({ pincodeRules: { ...latest.current, ...patch } });
  const countries = pincode.countries || [];
  const locations = pincode.locations || [];
  const groups = groupDeliveryLocations(pincode);

  useEffect(() => {
    const rows = latest.current.locations || [];
    rows.forEach((location) => {
      const key = locationKey(location.country, location.city, location.state);
      if (!location.city || hydrated.current.has(key)) return;
      hydrated.current.add(key);
      loadCityPincodes(location.country, location.city, location.state)
        .then((result) => {
          const current = latest.current.locations || [];
          const at = current.findIndex(
            (item) => locationKey(item.country, item.city, item.state) === key,
          );
          if (at < 0) return;
          const existing = current[at].pincodes || [];
          if (result.pincodes.length <= existing.length && (!result.state || current[at].state)) return;
          setPincode({
            locations: current.map((item, currentIndex) =>
              currentIndex === at
                ? {
                    ...item,
                    state: result.state || item.state,
                    pincodes: result.pincodes.length >= existing.length ? result.pincodes : existing,
                  }
                : item,
            ),
          });
        })
        .catch(() => {});
    });
  }, [locations.length]);

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

  const removeCountry = (iso) => {
    const current = latest.current;
    const nextCountries = (current.countries || []).filter((item) => item !== iso);
    setPincode({
      countries: nextCountries,
      locations: (current.locations || []).filter((item) => item.country !== iso),
      country: nextCountries[0] || iso,
    });
  };

  const addCity = async (country, city, state) => {
    const current = latest.current;
    if (!city || hasLocation(current, country, city, state)) return;
    const key = locationKey(country, city, state);
    setAddingKey(key);
    setLookupError("");
    try {
      const result = await loadCityPincodes(country, city, state);
      const latestCountries = latest.current.countries || [];
      hydrated.current.add(locationKey(country, city, result.state || state));
      setPincode({
        country,
        countries: latestCountries.includes(country) ? latestCountries : [...latestCountries, country],
        locations: [
          ...(latest.current.locations || []),
          {
            country,
            city,
            state: result.state || state || "",
            weight: weight.value || "",
            unit: weight.unit || "kg",
            pincodes: result.pincodes,
          },
        ],
      });
      if (!result.pincodes.length) {
        setLookupError(`Added ${city}, but no pincode list was found. Try another city spelling.`);
      }
    } catch {
      setLookupError("Could not fetch pincodes for this city. Try again.");
    } finally {
      setAddingKey("");
    }
  };

  const removeLocation = (index) => {
    const current = latest.current.locations || [];
    const removed = current[index];
    if (removed) hydrated.current.delete(locationKey(removed.country, removed.city, removed.state));
    setPincode({ locations: current.filter((_, currentIndex) => currentIndex !== index) });
  };

  return (
    <s-section heading="Pincode / delivery">
      <s-paragraph>
        Select a country, then a city — one at a time. All pincodes for that city are added automatically.
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
          <label className="edd-field">
            <span>Country</span>
            <select
              className="edd-input"
              value={countryPick}
              onChange={(event) => addCountry(event.currentTarget.value)}
            >
              <option value="">Select country</option>
              {PINCODE_COUNTRIES.filter((item) => !countries.includes(item.value)).map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {groups.length ? (
            <div className="edd-geo-tree">
              {groups.map((group) => (
                <CountryBlock
                  key={group.country}
                  group={group}
                  locations={locations}
                  addingKey={addingKey}
                  onAddCity={addCity}
                  onRemoveLocation={removeLocation}
                  onRemoveCountry={() => removeCountry(group.country)}
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

function CountryBlock({ group, locations, addingKey, onAddCity, onRemoveLocation, onRemoveCountry }) {
  const busy = addingKey.startsWith(`${group.country}|`);
  return (
    <div className="edd-geo-country">
      <div className="edd-geo-country__head">
        <strong>{group.label}</strong>
        <button type="button" className="edd-pin-list__remove" onClick={onRemoveCountry}>
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
            const index = locations.findIndex(
              (item) =>
                locationKey(item.country, item.city, item.state) ===
                locationKey(city.country, city.city, city.state),
            );
            const key = locationKey(city.country, city.city, city.state);
            const pins = city.pincodes || [];
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
                  <button type="button" className="edd-pin-list__remove" onClick={() => onRemoveLocation(index)}>
                    Remove
                  </button>
                </div>
                {pins.length ? (
                  <ul className="edd-geo-pins">
                    {pins.map((item) => (
                      <li key={item.code || item} className="edd-geo-pin">
                        {item.code || item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="edd-help">Fetching pincodes for this city…</p>
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
      <input
        className="edd-input"
        value={query}
        disabled={disabled}
        placeholder="Type a city name, then select it"
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
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
        <p className="edd-help">No matching city. Try another spelling.</p>
      ) : needle.length >= 2 && loading ? (
        <p className="edd-help">Searching cities…</p>
      ) : null}
    </div>
  );
}
