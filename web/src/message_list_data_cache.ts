import * as all_messages_data from "./all_messages_data";
import type {Filter} from "./filter";
import type {MessageListData} from "./message_list_data";

// LRU cache for message list data.
//
// While it's unlikely that user will narrow to empty filter,
// but we will still need to update all_messages_data since it used
// as super set for populating other views.
let cache = new Map<number, MessageListData>([[0, all_messages_data.all_messages_data]]);
let latest_key = 0;

// Maximum number of data items to cache.
const CACHE_STORAGE_LIMIT = 100;
const KEY_RESET_THRESHOLD = 1000000000;

function reset_keys(): void {
    const new_cache = new Map<number, MessageListData>();
    let new_key = -1;
    for (const data of cache.values()) {
        new_key += 1;
        new_cache.set(new_key, data);
    }
    cache = new_cache;
    latest_key = new_key;
}

function move_to_end(key: number, cached_data: MessageListData): void {
    // Move the item to the end of the cache.
    // Map remembers the original insertion order of the keys.
    cache.delete(key);
    latest_key += 1;
    cache.set(latest_key, cached_data);

    // Reset latest_key if it exceeds the threshold
    if (latest_key >= KEY_RESET_THRESHOLD) {
        reset_keys();
    }
}

export function get(filter: Filter): MessageListData | undefined {
    for (const [key, cached_data] of cache.entries()) {
        if (cached_data.filter.equals(filter)) {
            move_to_end(key, cached_data);
            return cached_data;
        }
    }
    return undefined;
}

export function add(message_list_data: MessageListData): void {
    for (const [key, cached_data] of cache.entries()) {
        if (cached_data.filter.equals(message_list_data.filter)) {
            move_to_end(key, cached_data);
            return;
        }
    }

    if (cache.size >= CACHE_STORAGE_LIMIT) {
        // Remove the oldest item from the cache.
        for (const [key, cached_data] of cache.entries()) {
            // We never want to remove the all_messages_data from the cache.
            if (cached_data.filter.equals(all_messages_data.all_messages_data.filter)) {
                continue;
            }
            cache.delete(key);
            break;
        }
    }

    latest_key += 1;
    cache.set(latest_key, message_list_data);

    // Reset latest_key if it exceeds the threshold
    if (latest_key >= KEY_RESET_THRESHOLD) {
        reset_keys();
    }
}

export function all(): MessageListData[] {
    return [...cache.values()];
}

export function clear(): void {
    cache = new Map([[0, all_messages_data.all_messages_data]]);
    latest_key = 0;
}
