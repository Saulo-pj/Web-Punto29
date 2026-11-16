import { useCallback, useEffect, useMemo, useReducer } from "react";
import {
  getLargeGroupOptions,
  getRequiredTables,
  getSelectionOrientation,
  getValidNextTables,
  isSelectionComplete,
} from "../domain/tableRules";
import { getReservedTables } from "../services/reservationsApi";

const initialState = { selection: [], orientation: null, specialConfigId: null, noticeAcknowledged: false, message: "" };

const reducer = (state, action) => {
  switch (action.type) {
    case "SELECT_TABLE":
      return { ...state, selection: action.selection, orientation: getSelectionOrientation(action.selection), message: "" };
    case "SELECT_SPECIAL":
      return { ...state, specialConfigId: action.id, message: "" };
    case "ACK_NOTICE":
      return { ...state, noticeAcknowledged: true };
    case "UNDO":
      return { ...state, selection: state.selection.slice(0, -1), orientation: getSelectionOrientation(state.selection.slice(0, -1)) };
    case "RESET":
      return initialState;
    case "MESSAGE":
      return { ...state, message: action.message };
    default:
      return state;
  }
};

export const useTableSelection = (reservation, floorConfig = null) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [availability, setAvailability] = useReducer(
    (current, action) => (action.type === "loading" ? { loading: true, error: null, reservedIds: [] } : action),
    { loading: true, error: null, reservedIds: [] },
  );
  const partySize = Number(reservation.partySize) || 0;
  const { date, service, time, locationId } = reservation;
  const required = useMemo(() => getRequiredTables(partySize, floorConfig, state.selection, availability.reservedIds), [partySize, floorConfig, state.selection, availability.reservedIds]);

  const refresh = useCallback(async () => {
    setAvailability({ type: "loading" });
    try {
      const reservedIds = await getReservedTables({ date, service, time, locationId });
      setAvailability({ loading: false, error: null, reservedIds });
    } catch (error) {
      setAvailability({ loading: false, error, reservedIds: [] });
    }
  }, [date, service, time, locationId]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    refresh();
  }, [refresh, floorConfig]);

  const validNextIds = useMemo(
    () => getValidNextTables(state.selection, partySize, availability.reservedIds, floorConfig),
    [state.selection, partySize, availability.reservedIds, floorConfig],
  );

  return {
    state: ["first", "venue17"].includes(floorConfig?.id) ? { ...state, orientation: getSelectionOrientation(state.selection, floorConfig.adjacencyLines) } : state,
    dispatch,
    required,
    availability,
    refresh,
    validNextIds,
    complete: state.specialConfigId ? getLargeGroupOptions(partySize).includes(state.specialConfigId) : isSelectionComplete(state.selection, partySize, floorConfig),
  };
};
