-- CreateIndex
CREATE UNIQUE INDEX "qsos_event_id_participant_callsign_date_time_band_id_mode_i_key" ON "qsos"("event_id", "participant_callsign", "date_time", "band_id", "mode_id");

